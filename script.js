// Elements
const expensesContainer = document.getElementById("expensesContainer");
const addExpenseBtn = document.getElementById("addExpenseBtn");
const generatePdfBtn = document.getElementById("generatePdfBtn");
const receiptInput = document.getElementById("receiptFiles");

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

// Convert image to PDF page using pdf-lib
async function imageToPdfPage(imgFile) {
    const arrayBuffer = await imgFile.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.create();
    const img = imgFile.type === "image/png" ? await pdfDoc.embedPng(arrayBuffer) : await pdfDoc.embedJpg(arrayBuffer);
    const page = pdfDoc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    return await pdfDoc.save();
}

// Generate the reimbursement PDF
generatePdfBtn.addEventListener("click", async () => {
    const { jsPDF } = window.jspdf;
    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const submissionDate = document.getElementById("submissionDate").value;

    // --- Step 1: Create main form PDF ---
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Reimbursement Request", 105, 20, null, null, "center");

    doc.setFontSize(12);
    doc.text(`Employee: ${firstName} ${lastName}`, 20, 40);
    doc.text(`Date: ${submissionDate}`, 20, 50);

    // Table headers
    const startY = 70;
    const colX = [20, 60, 130, 160, 190]; // last column can be ignored
    doc.setFont(undefined, "bold");
    doc.text("Date", colX[0], startY);
    doc.text("Description", colX[1], startY);
    doc.text("Amount + Mileage ($)", colX[2], startY);
    doc.setFont(undefined, "normal");

    // Table rows
    let total = 0;
    const rows = document.querySelectorAll(".expenseRow");
    let y = startY + 10;
    rows.forEach(row => {
        const date = row.querySelector(".expenseDate").value;
        const desc = row.querySelector(".expenseDesc").value;
        const amount = parseFloat(row.querySelector(".expenseAmount").value) || 0;
        const miles = parseFloat(row.querySelector(".expenseMiles").value) || 0;
        const mileageAmount = miles * 0.7;
        const combined = amount + mileageAmount;
        total += combined;

        doc.text(date, colX[0], y);
        doc.text(desc, colX[1], y);
        doc.text(combined.toFixed(2), colX[2], y);
        y += 10;
    });

    doc.setFont(undefined, "bold");
    doc.text(`Total Reimbursement: $${total.toFixed(2)}`, 20, y + 10);

    const mainPdfBytes = doc.output("arraybuffer");

    // --- Step 2: Prepare receipts PDFs ---
    const receiptFiles = receiptInput.files;
    let receiptPdfs = [];

    for (let file of receiptFiles) {
        if (file.type === "application/pdf") {
            receiptPdfs.push(await file.arrayBuffer());
        } else if (file.type.startsWith("image/")) {
            const imgPdf = await imageToPdfPage(file);
            receiptPdfs.push(imgPdf);
        }
    }

    // --- Step 3: Merge all PDFs using pdf-lib ---
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

    // Download final PDF
    const blob = new Blob([finalBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${submissionDate}_Reimbursement_${firstName}_${lastName}.pdf`;
    link.click();
});
