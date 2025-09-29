// Elements
const expensesContainer = document.getElementById("expensesContainer");
const addExpenseBtn = document.getElementById("addExpenseBtn");
const generatePdfBtn = document.getElementById("generatePdfBtn");
const receiptInput = document.getElementById("receiptFiles");

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

// Add receipts using FileReader
async function addReceiptImages(doc) {
    const files = receiptInput.files;
    if (!files.length) return;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) continue;

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
}

// Generate PDF
generatePdfBtn.addEventListener("click", async () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const submissionDate = document.getElementById("submissionDate").value;

    // Optional: add company logo
    // doc.addImage("logo.png", "PNG", 150, 10, 40, 20); // replace with your logo

    // --- Page 1: Form + Expenses Table ---
    doc.setFontSize(16);
    doc.text("Reimbursement Request", 105, 20, null, null, "center");

    doc.setFontSize(12);
    doc.text(`Employee: ${firstName} ${lastName}`, 20, 40);
    doc.text(`Submission Date: ${submissionDate}`, 20, 50);

    const startY = 70;
    const colX = [20, 50, 120, 150, 180];
    const headers = ["Date", "Description", "Amount ($)", "Miles", "Mileage $"];

    // Draw headers
    doc.setFont(undefined, 'bold');
    headers.forEach((text, i) => doc.text(text, colX[i], startY));
    doc.setFont(undefined, 'normal');

    // Draw table grid
    const rows = document.querySelectorAll(".expenseRow");
    const rowHeight = 10;
    let total = 0;

    rows.forEach((row, i) => {
        const expenseDate = row.querySelector(".expenseDate").value;
        const desc = row.querySelector(".expenseDesc").value;
        const amount = parseFloat(row.querySelector(".expenseAmount").value) || 0;
        const miles = parseFloat(row.querySelector(".expenseMiles").value) || 0;
        const mileageAmount = miles * 0.7;
        total += amount + mileageAmount;

        const y = startY + rowHeight + i * rowHeight;

        // Alternating row background
        if (i % 2 === 0) {
            doc.setFillColor(240, 240, 240);
            doc.rect(15, y - 7, 180, rowHeight, 'F');
        }

        doc.text(expenseDate, colX[0], y);
        doc.text(desc, colX[1], y);
        doc.text(amount.toFixed(2), colX[2], y);
        doc.text(miles ? miles.toFixed(1) : "-", colX[3], y);
        doc.text(mileageAmount ? mileageAmount.toFixed(2) : "-", colX[4], y);
    });

    // Draw table borders
    const tableTop = startY - 5;
    const tableBottom = startY + rowHeight + rows.length * rowHeight - 2;
    doc.line(15, tableTop, 195, tableTop); // top
    doc.line(15, tableBottom, 195, tableBottom); // bottom
    [20, 50, 120, 150, 180, 195].forEach(x => doc.line(x, tableTop, x, tableBottom)); // vertical lines

    // Total
    doc.setFont(undefined, 'bold');
    doc.text(`Total Reimbursement: $${total.toFixed(2)}`, 20, tableBottom + 15);
    doc.setFont(undefined, 'normal');

    // Receipts (page 2+)
    await addReceiptImages(doc);

    doc.save(`${submissionDate}_Reimbursement_${firstName}_${lastName}.pdf`);
});
