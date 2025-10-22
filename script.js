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

// Add PNG/JPG as PDF-Lib page
async function addImagePage(pdfDoc, imgFile) {
    const bytes = await imgFile.arrayBuffer();
    const image = imgFile.type === "image/png"
        ? await pdfDoc.embedPng(bytes)
        : await pdfDoc.embedJpg(bytes);
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
}

// Generate final PDF
generatePdfBtn.addEventListener("click", async () => {
    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const date = document.getElementById("submissionDate").value;

    if (!firstName || !lastName || !date) {
        alert("Please fill out all personal information fields.");
        return;
    }

    const pdfDoc = await PDFLib.PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();

    // Draw header
    page.drawText("Reimbursement Request", { x: 200, y: height - 50, size: 18 });
    page.drawText(`Employee: ${firstName} ${lastName}`, { x: 50, y: height - 80, size: 12 });
    page.drawText(`Date: ${date}`, { x: 50, y: height - 100, size: 12 });

    // Draw expenses table
    let tableY = height - 140;
    const rows = Array.from(document.querySelectorAll(".expenseRow"));
    let total = 0;
    page.drawText("Date        Description        Amount + Mileage ($)    Miles", { x: 50, y: tableY, size: 10 });
    tableY -= 20;
    for (const row of rows) {
        const dateVal = row.querySelector(".expenseDate").value;
        const descVal = row.querySelector(".expenseDesc").value;
        const amountVal = parseFloat(row.querySelector(".expenseAmount").value) || 0;
        const milesVal = parseFloat(row.querySelector(".expenseMiles")?.value) || 0;
        const totalAmount = amountVal + milesVal * 0.7;
        total += totalAmount;

        page.drawText(`${dateVal}    ${descVal}    ${totalAmount.toFixed(2)}    ${milesVal || "-"}`, { x: 50, y: tableY, size: 10 });
        tableY -= 20;
        if (tableY < 50) { // add new page if table too long
            tableY = height - 50;
            pdfDoc.addPage();
        }
    }
    page.drawText(`Total Reimbursement: $${total.toFixed(2)}`, { x: 50, y: tableY - 10, size: 12 });

    // Add receipts
    for (const file of uploadedReceipts) {
        if (file.type === "application/pdf") {
            const bytes = await file.arrayBuffer();
            const receiptPdf = await PDFLib.PDFDocument.load(bytes);
            const pages = await pdfDoc.copyPages(receiptPdf, receiptPdf.getPageIndices());
            pages.forEach(p => pdfDoc.addPage(p));
        } else if (file.type.startsWith("image/")) {
            await addImagePage(pdfDoc, file);
        }
    }

    // Save
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${date}_Reimbursement_${firstName}_${lastName}.pdf`;
    a.click();
});
