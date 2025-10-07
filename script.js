// Elements
const expensesContainer = document.getElementById("expensesContainer");
const addExpenseBtn = document.getElementById("addExpenseBtn");
const generatePdfBtn = document.getElementById("generatePdfBtn");
const receiptInput = document.getElementById("receiptFiles");
const uploadReceiptsBtn = document.getElementById("uploadReceiptsBtn");
const receiptList = document.getElementById("receiptList");

let uploadedReceipts = [];

// Add a new expense row
function addExpenseRow() {
    const div = document.createElement("div");
    div.classList.add("expenseRow");
    div.innerHTML = `
        <label>Expense Date: <input type="date" class="expenseDate" required></label>
        <label>Description: <input type="text" class="expenseDesc" required></label>
        <label>Amount ($): <input type="number" class="expenseAmount" step="0.01" required></label>
        <label>Mileage (if applicable): <input type="number" class="expenseMiles" step="0.1"></label>
        <button type="button" class="removeExpenseBtn">Remove</button>
        <hr>
    `;
    expensesContainer.appendChild(div);
    div.querySelector(".removeExpenseBtn").addEventListener("click", () => div.remove());
}

addExpenseBtn.addEventListener("click", addExpenseRow);

// Upload receipts to list
uploadReceiptsBtn.addEventListener("click", () => {
    const files = Array.from(receiptInput.files);
    files.forEach(file => {
        uploadedReceipts.push(file);
        const li = document.createElement("li");
        li.textContent = file.name + " ";
        const removeBtn = document.createElement("button");
        removeBtn.textContent = "Remove";
        removeBtn.addEventListener("click", () => {
            uploadedReceipts = uploadedReceipts.filter(f => f !== file);
            li.remove();
        });
        li.appendChild(removeBtn);
        receiptList.appendChild(li);
    });
    receiptInput.value = "";
});

// Convert image to PDF page using pdf-lib
async function imageToPdfPage(imgFile) {
    const arrayBuffer = await imgFile.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.create();
    const img = imgFile.type === "image/png" ? await pdfDoc.embedPng(arrayBuffer) : await pdfDoc.embedJpg(arrayBuffer);
    const page = pdfDoc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    return await pdfDoc.save();
}

// Generate PDF
generatePdfBtn.addEventListener("click", async () => {
    const { jsPDF } = window.jspdf;
    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const submissionDate = document.getElementById("submissionDate").value;

    // --- Page 1: Form + Expenses ---
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Reimbursement Request", 105, 20, null, null, "center");
    doc.setFontSize(12);
    doc.text(`Employee: ${firstName} ${lastName}`, 20, 40);
    doc.text(`Date: ${submissionDate}`, 20, 50);

    // Expenses list
    let startY = 70;
    const rows = document.querySelectorAll(".expenseRow");
    let total = 0;
    rows.forEach((row, i) => {
        const date = row.querySelector(".expenseDate").value;
        const desc = row.querySelector(".expenseDesc").value;
        const amount = parseFloat(row.querySelector(".expenseAmount").value) || 0;
        const miles = parseFloat(row.querySelector(".expenseMiles").value) || 0;
        const combined = amount + miles * 0.7;
        total += combined;

        const y = startY + i * 10;
        doc.text(date, 20, y);
        doc.text(desc, 50, y);
        doc.text(combined.toFixed(2), 120, y);
    });

    doc.setFont(undefined, "bold");
    doc.text(`Total Reimbursement: $${total.toFixed(2)}`, 20, startY + rows.length * 10 + 10);
    doc.setFont(undefined, "normal");

    const mainPdfBytes = doc.output("arraybuffer");

    // --- Receipts ---
    let receiptPdfs = [];
    for (let file of uploadedReceipts) {
        if (file.type === "application/pdf") {
            receiptPdfs.push(await file.arrayBuffer());
        } else if (file.type.startsWith("image/")) {
            const imgPdf = await imageToPdfPage(file);
            receiptPdfs.push(imgPdf);
        }
    }

    // Merge main PDF + receipts
    const finalPdf = await PDFLib.PDFDocument.create();
    const mainPdf = await PDFLib.PDFDocument.load(mainPdfBytes);
    const mainPages = await finalPdf.copyPages(mainPdf, mainPdf.getPageIndices());
    mainPages.forEach(p => finalPdf.addPage(p));

    for (let rpdf of receiptPdfs) {
        const receiptDoc = await PDFLib.PDFDocument.load(rpdf);
        const pages = await finalPdf.copyPages(receiptDoc, receiptDoc.getPageIndices());
        pages.forEach(p => finalPdf.addPage(p));
    }

    const finalBytes = await finalPdf.save();
    const blob = new Blob([finalBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${submissionDate}_Reimbursement_${firstName}_${lastName}.pdf`;
    link.click();
});
