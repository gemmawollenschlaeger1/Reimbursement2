// Elements
const expensesContainer = document.getElementById("expensesContainer");
const addExpenseBtn = document.getElementById("addExpenseBtn");
const generatePdfBtn = document.getElementById("generatePdfBtn");
const receiptInput = document.getElementById("receiptFiles");
const uploadReceiptsBtn = document.getElementById("uploadReceiptsBtn");
const selectedReceiptsList = document.getElementById("selectedReceiptsList");

let uploadedReceipts = [];

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

    receiptInput.value = "";
});

// Convert PNG to PDF-Lib page
async function addImageAsPage(pdfDoc, imgFile) {
    const imgBytes = await imgFile.arrayBuffer();
    const img = imgFile.type === "image/png" ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes);
    const page = pdfDoc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
}

// Generate PDF
generatePdfBtn.addEventListener("click", async () => {
    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const date = document.getElementById("submissionDate").value;

    if (!firstName || !lastName || !date) {
        alert("Please fill out all personal information fields.");
        return;
    }

    // Step 1: Generate the reimbursement PDF using jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

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
        head: [["Date", "Description", "Amount + Mileage ($)", "Miles"]],
        body: tableData,
        styles: { halign: "left" },
        headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [236, 240, 241] },
    });

    doc.text(`Total Reimbursement: $${total.toFixed(2)}`, 20, doc.lastAutoTable.finalY + 10);

    // Step 2: Merge with PDF-Lib
    const pdfBytes = doc.output("arraybuffer");
    const finalPdf = await PDFLib.PDFDocument.create();

    // Add the jsPDF content
    const jsPdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
    const pages = await finalPdf.copyPages(jsPdfDoc, jsPdfDoc.getPageIndices());
    pages.forEach(p => finalPdf.addPage(p));

    // Add uploaded receipts
    for (const file of uploadedReceipts) {
        if (file.type === "application/pdf") {
            const arrayBuffer = await file.arrayBuffer();
            const receiptPdf = await PDFLib.PDFDocument.load(arrayBuffer);
            const receiptPages = await finalPdf.copyPages(receiptPdf, receiptPdf.getPageIndices());
            receiptPages.forEach(p => finalPdf.addPage(p));
        } else if (file.type.startsWith("image/")) {
            await addImageAsPage(finalPdf, file);
        }
    }

    // Save final PDF
    const finalBytes = await finalPdf.save();
    const blob = new Blob([finalBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${date}_Reimbursement_${firstName}_${lastName}.pdf`;
    a.click();
});

