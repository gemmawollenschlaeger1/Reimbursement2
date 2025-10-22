// Elements
const expensesContainer = document.getElementById("expensesContainer");
const addExpenseBtn = document.getElementById("addExpenseBtn");
const generatePdfBtn = document.getElementById("generatePdfBtn");
const receiptInput = document.getElementById("receiptFiles");
const uploadReceiptsBtn = document.getElementById("uploadReceiptsBtn");
const selectedReceiptsList = document.getElementById("selectedReceiptsList");

let uploadedReceipts = [];

// PDF.js setup
const pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.10.100/pdf.worker.min.js';

// Add a new expense row
function addExpenseRow() {
    const tr = document.createElement("tr");
    tr.classList.add("expenseRow");
    tr.innerHTML = `
        <td><input type="date" class="expenseDate" required></td>
        <td><input type="text" class="expenseDesc" required></td>
        <td><input type="number" class="expenseAmount" step="0.01" required></td>
        <td><input type="number" class="expenseMiles" step="0.1"></td>
        <td><button type="button" class="removeExpenseBtn">Remove</button></td>
    `;
    expensesContainer.appendChild(tr);
    tr.querySelector(".removeExpenseBtn").addEventListener("click", () => tr.remove());
}

addExpenseBtn.addEventListener("click", addExpenseRow);

// Upload receipts
uploadReceiptsBtn.addEventListener("click", () => {
    const files = Array.from(receiptInput.files);
    files.forEach(file => {
        uploadedReceipts.push(file);

        const li = document.createElement("li");
        li.textContent = file.name;

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "Remove";
        removeBtn.classList.add("removeBtn");
        removeBtn.addEventListener("click", () => {
            uploadedReceipts = uploadedReceipts.filter(f => f !== file);
            li.remove();
        });

        const uploadedTag = document.createElement("span");
        uploadedTag.textContent = "Uploaded ✅";
        uploadedTag.classList.add("uploadedTag");

        li.appendChild(uploadedTag);
        li.appendChild(removeBtn);
        selectedReceiptsList.appendChild(li);
    });

    receiptInput.value = ""; // reset file input
});

// Add receipts (images and PDF pages) to PDF
async function addReceiptImages(doc) {
    for (let i = 0; i < uploadedReceipts.length; i++) {
        const file = uploadedReceipts[i];

        if (file.type.startsWith("image/")) {
            const imgData = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = e => reject(e);
                reader.readAsDataURL(file);
            });

            doc.addPage();
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 20;

            const img = new Image();
            img.src = imgData;
            await new Promise(resolve => { img.onload = resolve; });

            const pdfWidth = pageWidth - margin * 2;
            const pdfHeight = (img.height * pdfWidth) / img.width;

            doc.addImage(imgData, 'JPEG', margin, margin, pdfWidth, pdfHeight);
        }

        if (file.type === "application/pdf") {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: 2 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({ canvasContext: context, viewport }).promise;

                const imgData = canvas.toDataURL('image/png');
                doc.addPage();
                const pageWidth = doc.internal.pageSize.getWidth();
                const pdfWidth = pageWidth - 40;
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

                doc.addImage(imgData, 'PNG', 20, 20, pdfWidth, pdfHeight);
            }
        }
    }
}

// Generate PDF
generatePdfBtn.addEventListener("click", async () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const date = document.getElementById("submissionDate").value;

    if (!firstName || !lastName || !date) {
        alert("Please fill out all personal information fields.");
        return;
    }

    doc.setFontSize(16);
    doc.text("Reimbursement Request", 105, 20, null, null, "center");
    doc.setFontSize(12);
    doc.text(`Employee: ${firstName} ${lastName}`, 20, 40);
    doc.text(`Date: ${date}`, 20, 50);

    const rows = document.querySelectorAll(".expenseRow");
    let total = 0;
    const tableData = [];

    rows.forEach(row => {
        const dateVal = row.querySelector(".expenseDate").value;
        const descVal = row.querySelector(".expenseDesc").value;
        const amountVal = parseFloat(row.querySelector(".expenseAmount").value) || 0;
        const milesVal = parseFloat(row.querySelector(".expenseMiles")?.value) || 0;
        const mileageAmount = milesVal * 0.7;
        const totalAmount = amountVal + mileageAmount;
        total += totalAmount;

        tableData.push([dateVal, descVal, totalAmount.toFixed(2), milesVal ? milesVal.toFixed(1) : "-"]);
    });

    doc.autoTable({
        startY: 70,
        head: [['Date', 'Description', 'Amount + Mileage ($)', 'Miles']],
        body: tableData,
        styles: { halign: 'left' },
        headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [236, 240, 241] }
    });

    doc.text(`Total Reimbursement: $${total.toFixed(2)}`, 20, doc.lastAutoTable.finalY + 10);

    await addReceiptImages(doc);

    doc.save(`${date}_Reimbursement_${firstName}_${lastName}.pdf`);
});
