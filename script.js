document.addEventListener("DOMContentLoaded", () => {
    // Elements
    const expensesContainer = document.getElementById("expensesContainer");
    const addExpenseBtn = document.getElementById("addExpenseBtn");
    const generatePdfBtn = document.getElementById("generatePdfBtn");
    const receiptInput = document.getElementById("receiptFiles");

    // Add a new expense row as table row
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

    // Add receipts to PDF
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

        const firstName = document.getElementById("firstName").value || "NoName";
        const lastName = document.getElementById("lastName").value || "NoName";
        let submissionDate = document.getElementById("submissionDate").value;

        if (!submissionDate) {
            const today = new Date();
            submissionDate = today.toISOString().split('T')[0];
        }

        const safeDate = submissionDate.replace(/[/\\?%*:|"<>]/g, "-");

        // Header
        doc.setFontSize(16);
        doc.text("Reimbursement Request", 105, 20, null, null, "center");

        doc.setFontSize(12);
        doc.text(`Employee: ${firstName} ${lastName}`, 20, 40);
        doc.text(`Submission Date: ${submissionDate}`, 20, 50);

        // Expenses
        let y = 70;
        let total = 0;
        const rows = document.querySelectorAll(".expenseRow");

        rows.forEach((row, i) => {
            const expenseDate = row.querySelector(".expenseDate").value;
            const desc = row.querySelector(".expenseDesc").value;
            const amount = parseFloat(row.querySelector(".expenseAmount").value) || 0;
            const miles = parseFloat(row.querySelector(".expenseMiles").value) || 0;
            const mileageAmount = miles * 0.7;
            total += amount + mileageAmount;

            doc.text(`${i + 1}. Date: ${expenseDate}`, 20, y);
            y += 7;
            doc.text(`   Description: ${desc}`, 20, y);
            y += 7;
            doc.text(`   Amount: $${amount.toFixed(2)}`, 20, y);
            if (miles) {
                y += 7;
                doc.text(`   Mileage: ${miles} miles ($${mileageAmount.toFixed(2)})`, 20, y);
            }
            y += 10;
        });

        // Total
        doc.setFont(undefined, 'bold');
        doc.text(`Total Reimbursement: $${total.toFixed(2)}`, 20, y);
        doc.setFont(undefined, 'normal');

        // Receipts
        await addReceiptImages(doc);

        // Save PDF
        doc.save(`${safeDate}_Reimbursement_${firstName}_${lastName}.pdf`);
    });
});
