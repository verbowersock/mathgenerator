(function () {
  // Polyfill for crypto.randomUUID if not available
  if (!window.crypto || !window.crypto.randomUUID) {
    if (!window.crypto) window.crypto = {};
    window.crypto.randomUUID = function () {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
          var r = (Math.random() * 16) | 0;
          var v = c == "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        }
      );
    };
  }

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const countInput = document.getElementById("count");
  const countValue = document.getElementById("countValue");
  const totalPreview = document.getElementById("totalPreview");
  const previewList = document.getElementById("problems");
  const loadingEl = document.getElementById("loading");
  const previewContainer = document.getElementById("preview");
  const previewBtn = document.getElementById("previewBtn");
  const pdfBtn = document.getElementById("pdfBtn");

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  // Store the current problems so PDF uses the same ones as preview
  let currentProblems = [];

  if (countInput && countValue) {
    const onRange = () => {
      countValue.textContent = countInput.value;
    };
    countInput.addEventListener("input", onRange);
    onRange();
  }

  // Handle borrowing checkbox state based on subtraction selection
  const opSubCheckbox = document.getElementById("opSub");
  const borrowSubCheckbox = document.getElementById("borrowSub");
  const carryAddCheckbox = document.getElementById("carryAdd");
  const opAddCheckbox = document.getElementById("opAdd");

  function updateCheckboxStates() {
    if (borrowSubCheckbox && opSubCheckbox) {
      borrowSubCheckbox.disabled = !opSubCheckbox.checked;
      if (!opSubCheckbox.checked) {
        borrowSubCheckbox.checked = false;
      }
    }

    if (carryAddCheckbox && opAddCheckbox) {
      carryAddCheckbox.disabled = !opAddCheckbox.checked;
      if (!opAddCheckbox.checked) {
        carryAddCheckbox.checked = false;
      }
    }
  }

  if (opSubCheckbox && borrowSubCheckbox) {
    opSubCheckbox.addEventListener("change", updateCheckboxStates);
  }

  if (opAddCheckbox && carryAddCheckbox) {
    opAddCheckbox.addEventListener("change", updateCheckboxStates);
  }

  // Initialize checkbox states
  updateCheckboxStates();

  // Navigation functionality
  const navToggle = document.querySelector(".navbar__toggle");
  const navMenu = document.querySelector(".navbar__menu");
  const navLinks = document.querySelectorAll(".navbar__link");

  // Mobile menu toggle
  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      navMenu.classList.toggle("navbar__menu--active");
    });
  }

  // Smooth scrolling for navigation links
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (href && href.startsWith("#")) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });

          // Close mobile menu if open
          if (navMenu) {
            navMenu.classList.remove("navbar__menu--active");
          }

          // Update active link
          navLinks.forEach((navLink) => {
            navLink.classList.remove("navbar__link--active");
          });
          link.classList.add("navbar__link--active");
        }
      }
    });
  });

  function readControls() {
    const minRaw = Number(document.getElementById("min").value);
    const maxRaw = Number(document.getElementById("max").value);
    const worksheetTitle =
      document.getElementById("worksheetTitle").value.trim() ||
      "Math Worksheet";
    const worksheetCount = parseInt(
      document.getElementById("worksheetCount").value,
      10
    );
    const opAdd = document.getElementById("opAdd").checked;
    const opSub = document.getElementById("opSub").checked;
    const opMul = document.getElementById("opMul").checked;
    const opDiv = document.getElementById("opDiv").checked;
    const carryAdd = document.getElementById("carryAdd").checked;
    const borrowSub = document.getElementById("borrowSub").checked;
    const count = parseInt(document.getElementById("count").value, 10);

    if (!(opAdd || opSub || opMul || opDiv)) {
      throw new Error("Select at least one operation");
    }
    if (!Number.isFinite(minRaw) || !Number.isFinite(maxRaw)) {
      throw new Error("Min and Max must be numbers");
    }
    if (!Number.isInteger(minRaw) || !Number.isInteger(maxRaw)) {
      throw new Error(
        "Only whole numbers allowed: Min and Max must be integers"
      );
    }
    if (minRaw < 0 || maxRaw < 0) {
      throw new Error("Only whole numbers allowed: Min and Max must be ≥ 0");
    }
    const min = minRaw;
    const max = maxRaw;
    if (min > max) {
      throw new Error("Min must be less than or equal to Max");
    }

    return {
      min,
      max,
      worksheetTitle,
      worksheetCount: clamp(worksheetCount, 1, 50),
      opAdd,
      opSub,
      opMul,
      opDiv,
      carryAdd,
      borrowSub,
      count: clamp(count, 1, 18),
    };
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function hasCarry(a, b) {
    let carry = 0;
    let x = a;
    let y = b;
    while (x > 0 || y > 0) {
      const da = x % 10;
      const db = y % 10;
      if (da + db + carry >= 10) return true;
      carry = Math.floor((da + db + carry) / 10);
      x = Math.floor(x / 10);
      y = Math.floor(y / 10);
    }
    return false;
  }

  function generateAddition(min, max, allowCarry) {
    for (let i = 0; i < 1000; i++) {
      const a = randInt(min, max);
      const b = randInt(min, max);
      if (allowCarry || !hasCarry(a, b)) {
        return { a, b, op: "+", answer: a + b };
      }
    }
    // Fallback: force a no-carry pair if needed by constraining digits
    const a = randInt(min, max);
    const b = Math.max(min, Math.min(max, 9 - (a % 10)));
    return { a, b, op: "+", answer: a + b };
  }

  function hasBorrow(a, b) {
    // Check if subtraction requires borrowing by examining each digit position
    const aStr = a.toString();
    const bStr = b.toString();
    const maxLength = Math.max(aStr.length, bStr.length);

    for (let i = 0; i < maxLength; i++) {
      const aDigit = parseInt(aStr[aStr.length - 1 - i]) || 0;
      const bDigit = parseInt(bStr[bStr.length - 1 - i]) || 0;
      if (aDigit < bDigit) {
        return true;
      }
    }
    return false;
  }

  function generateSubtraction(min, max, allowBorrow = true) {
    if (!allowBorrow) {
      // Generate problems that don't require borrowing
      for (let attempts = 0; attempts < 100; attempts++) {
        const a = randInt(min, max);
        const b = randInt(min, Math.min(a, max));
        if (!hasBorrow(a, b)) {
          return { a, b, op: "-", answer: a - b };
        }
      }
    }

    // Default behavior: allow borrowing or fallback if no non-borrowing found
    const a = randInt(min, max);
    const b = randInt(min, Math.min(a, max));
    return { a, b, op: "-", answer: a - b };
  }

  function generateMultiplication(min, max) {
    const a = randInt(min, max);
    const b = randInt(min, max);
    return { a, b, op: "×", answer: a * b };
  }

  function generateDivision(min, max) {
    // Ensure clean division (integer result)
    for (let i = 0; i < 1000; i++) {
      const minNonZero = Math.max(1, min);
      const b = randInt(minNonZero, Math.max(1, max)); // divisor ≥ 1
      const q = randInt(1, Math.max(1, max)); // quotient ≥ 1
      const a = b * q; // dividend ≥ 1
      if (a >= minNonZero && a <= max) {
        return { a, b, op: "÷", answer: q };
      }
    }
    // Fallback simple case
    const b = Math.max(1, min);
    const a = b * 1;
    return { a, b, op: "÷", answer: 1 };
  }

  function generateOne(settings) {
    const ops = [];
    if (settings.opAdd) ops.push("add");
    if (settings.opSub) ops.push("sub");
    if (settings.opMul) ops.push("mul");
    if (settings.opDiv) ops.push("div");
    const pick = ops[randInt(0, ops.length - 1)];
    switch (pick) {
      case "add":
        return generateAddition(settings.min, settings.max, settings.carryAdd);
      case "sub":
        return generateSubtraction(
          settings.min,
          settings.max,
          settings.borrowSub
        );
      case "mul":
        return generateMultiplication(settings.min, settings.max);
      case "div":
        return generateDivision(settings.min, settings.max);
      default:
        throw new Error("No operation selected");
    }
  }

  function generateList(settings) {
    const list = [];
    for (let i = 0; i < settings.count; i++) {
      list.push(generateOne(settings));
    }
    return list;
  }

  function renderPreview(list, settings) {
    const previewDescription = document.getElementById("previewDescription");

    // Update preview description based on worksheet count
    if (settings && settings.worksheetCount > 1) {
      previewDescription.textContent = `Preview of 1 worksheet (${settings.worksheetCount} unique worksheets will be generated)`;
      previewDescription.style.display = "block";
    } else {
      previewDescription.style.display = "none";
    }

    previewList.innerHTML = "";
    // Grid columns are managed via CSS; ensure consistent item heights using pre block
    list.forEach((p, idx) => {
      const li = document.createElement("li");
      const aStr = String(p.a);
      const bStr = String(p.b);
      const width = Math.max(aStr.length, bStr.length);
      const top = `  ${aStr.padStart(width, " ")}`;
      const bottom = `${p.op} ${bStr.padStart(width, " ")}`;
      const eq = `_____`; // visual separator; space for answer remains
      const text = `${top}\n${bottom}\n${eq}\n`;
      const pre = document.createElement("pre");
      pre.className = "vprob";
      pre.textContent = text;
      li.appendChild(pre);
      previewList.appendChild(li);
    });
    if (totalPreview) totalPreview.textContent = String(list.length);
  }

  let previewTimer = null;
  function onPreview() {
    try {
      // Show loader immediately and blur content
      loadingEl &&
        ((loadingEl.className = "loading show"),
        loadingEl.setAttribute("aria-busy", "true"));
      previewContainer && previewContainer.classList.add("loading-active");
      // Debounce rapid changes and add a minimum display time for the loader
      if (previewTimer) clearTimeout(previewTimer);
      previewTimer = setTimeout(() => {
        const start = Date.now();
        let list = [];
        let settings = null;
        try {
          settings = readControls();
          list = generateList(settings);
          currentProblems = list; // Store for PDF generation
        } catch (e) {
          loadingEl &&
            ((loadingEl.className = "loading"),
            loadingEl.setAttribute("aria-busy", "false"));
          alert(e.message || String(e));
          return;
        }
        // Small intentional delay to avoid jarring UI updates
        const elapsed = Date.now() - start;
        const minVisibleMs = 300;
        const remaining = Math.max(0, minVisibleMs - elapsed);
        setTimeout(() => {
          renderPreview(list, settings);
          loadingEl &&
            ((loadingEl.className = "loading"),
            loadingEl.setAttribute("aria-busy", "false"));
          previewContainer &&
            previewContainer.classList.remove("loading-active");
        }, remaining);
      }, 250);
    } catch (e) {
      loadingEl &&
        ((loadingEl.className = "loading"),
        loadingEl.setAttribute("aria-busy", "false"));
      previewContainer && previewContainer.classList.remove("loading-active");
      alert(e.message || String(e));
    }
  }

  function createWorksheetHTML(list, title = "Math Worksheet") {
    const problemsHTML = list
      .map((p, idx) => {
        const aStr = String(p.a);
        const bStr = String(p.b);
        const width = Math.max(aStr.length, bStr.length);
        const top = `  ${aStr.padStart(width, " ")}`;
        const bottom = `${p.op} ${bStr.padStart(width, " ")}`;

        return `
        <div class="pdf-problem">
          <div class="pdf-problem-number">${idx + 1}.</div>
          <div class="pdf-problem-text">${top}<br/>${bottom}<br/><div class="pdf-answer-line"></div></div>
        </div>`;
      })
      .join("");

    return `
      <div class="pdf-worksheet generating">
        <div class="pdf-header">
          <div class="pdf-title">${title}</div>
          <div class="pdf-info">
            <span>Name: _______________</span>
            <span>Date: _______________</span>
            <span>Score: ___ / ${list.length}</span>
          </div>
        </div>
        <div class="pdf-problems">
          ${problemsHTML}
        </div>
      </div>`;
  }

  async function toPdf(list, title = "Math Worksheet") {
    const worksheetHTML = createWorksheetHTML(list, title);

    // Create temporary container
    const container = document.createElement("div");
    container.innerHTML = worksheetHTML;
    document.body.appendChild(container);

    const options = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: "worksheet.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      },
      jsPDF: {
        unit: "in",
        format: "letter",
        orientation: "portrait",
        compress: true,
      },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    };

    try {
      // Wait a moment for styles to load
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Find the actual worksheet element
      const worksheetElement = container.querySelector(".pdf-worksheet");
      if (!worksheetElement) {
        throw new Error("Could not find worksheet element");
      }

      await html2pdf().set(options).from(worksheetElement).save();
    } finally {
      // Clean up
      document.body.removeChild(container);
    }
  }

  // Test function to verify html2pdf works
  async function testPdf() {
    console.log("Starting PDF test...");

    // First check if html2pdf is available
    if (typeof html2pdf === "undefined") {
      console.error("html2pdf is not loaded!");
      alert("html2pdf library is not loaded!");
      return;
    }
    console.log("html2pdf library is available");

    const testHTML = `
      <div style="padding: 40px; font-family: Arial, sans-serif; background: white;">
        <h1 style="color: black; font-size: 24px;">Test PDF</h1>
        <p style="color: black; font-size: 16px;">This is a test to see if html2pdf is working.</p>
        <div style="margin: 20px 0; font-family: monospace; font-size: 18px;">
          <div>1. 12 + 34 = ___</div>
          <div>2. 56 - 78 = ___</div>
          <div>3. 91 × 23 = ___</div>
        </div>
      </div>
    `;

    console.log("Creating container element...");
    const container = document.createElement("div");
    container.innerHTML = testHTML;

    // Make it visible but off-screen
    container.style.position = "absolute";
    container.style.top = "-9999px";
    container.style.left = "-9999px";
    container.style.width = "8.5in";
    container.style.height = "11in";
    container.style.backgroundColor = "white";
    container.style.visibility = "visible";

    document.body.appendChild(container);

    // Wait for rendering
    await new Promise((resolve) => setTimeout(resolve, 200));

    console.log("Container added to DOM:", container);
    console.log("Container HTML:", container.innerHTML);

    try {
      console.log("Starting html2pdf conversion...");
      console.log(
        "Container dimensions:",
        container.offsetWidth,
        "x",
        container.offsetHeight
      );
      console.log(
        "Container visibility:",
        getComputedStyle(container).visibility
      );

      const options = {
        margin: 36, // 0.5 inch in points
        filename: "test.pdf",
        html2canvas: {
          scale: 2,
          backgroundColor: "#ffffff",
          logging: true,
          useCORS: true,
          allowTaint: true,
          width: 612, // Letter width in points
          height: 792, // Letter height in points
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: {
          unit: "pt",
          format: "letter",
          orientation: "portrait",
        },
      };

      console.log("Options:", options);

      const element = html2pdf().set(options).from(container);
      console.log("html2pdf element created:", element);

      const result = await element.save();
      console.log("PDF generation completed:", result);
    } catch (error) {
      console.error("Error during PDF generation:", error);
      alert("Error generating PDF: " + error.message);
    } finally {
      console.log("Cleaning up container...");
      document.body.removeChild(container);
    }
  }

  // Improved jsPDF function with better spacing
  function toPdfJsPDF(list, title = "Math Worksheet") {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 28;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(18);
    doc.text(title, margin, 48);

    doc.setFontSize(12);
    const headerY = 92;
    const headerColWidth = (pageWidth - 2 * margin) / 3;
    const headerLeftX = margin;
    const headerCenterX = margin + headerColWidth * 1.5;
    const headerRightX = pageWidth - margin;
    doc.text("Name: _______________", headerLeftX, headerY, { align: "left" });
    doc.text("Date: _______________", headerCenterX, headerY, {
      align: "center",
    });
    doc.text(`Score: ___ / ${list.length}`, headerRightX, headerY, {
      align: "right",
    });

    let y = headerY + 58;
    // Calculate line height based on number of problems to fit on page
    const maxRows = Math.ceil(list.length / 3); // 3 columns
    const availableHeight = 792 - (headerY + 58) - 40; // Page height - header - bottom margin
    const lineHeight = Math.min(108, Math.floor(availableHeight / maxRows));

    doc.setFontSize(18); // Larger font for better readability
    doc.setFont("courier", "normal");

    const cols = 3;
    const problemsLeftMargin = margin + 40;
    const problemsRightMargin = margin + 20;
    const problemsWidth = pageWidth - problemsLeftMargin - problemsRightMargin;
    const colWidth = problemsWidth / cols;
    const colX = new Array(cols)
      .fill(0)
      .map((_, i) => problemsLeftMargin + i * colWidth);

    list.forEach((p, idx) => {
      const col = idx % cols;
      const rowInPage = Math.floor(idx / cols);
      const x = colX[col];
      const baseY = y + rowInPage * lineHeight;

      // Calculate based on original numbers first
      const aOriginal = String(p.a);
      const bOriginal = String(p.b);
      const width = Math.max(aOriginal.length, bOriginal.length);

      // Create spaced numbers with proper alignment
      function addSpacingAligned(numStr, targetWidth) {
        const padded = numStr.padStart(targetWidth, " ");
        return padded.split("").join(" ");
      }

      const aStr = addSpacingAligned(aOriginal, width);
      const bStr = addSpacingAligned(bOriginal, width);
      const opWithB = p.op + " " + bStr;

      // Calculate final width based on spaced numbers
      const finalWidth = Math.max(aStr.length, opWithB.length);
      const top = aStr.padStart(finalWidth, " ");
      const bottom = opWithB.padStart(finalWidth, " ");
      const line = "_".repeat(finalWidth);

      doc.setFontSize(10);
      doc.text(`${idx + 1}.`, x, baseY);

      doc.setFontSize(18);
      const contentX = x + 24;
      doc.text(top, contentX, baseY + 10);
      doc.text(bottom, contentX, baseY + 32);
      doc.text(line, contentX, baseY + 42);
    });

    return doc;
  }

  // Multiple worksheets version - generate directly in one document
  function generateMultipleWorksheetsJsPDF(settings) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "letter" });

    for (
      let worksheetNum = 1;
      worksheetNum <= settings.worksheetCount;
      worksheetNum++
    ) {
      const list = generateList(settings);

      if (worksheetNum > 1) {
        doc.addPage();
      }

      // Generate worksheet content directly in this document
      addWorksheetPageToDoc(
        doc,
        list,
        `${settings.worksheetTitle} - Sheet ${worksheetNum}`
      );
    }

    return doc;
  }

  // Helper function to add worksheet content to existing doc
  function addWorksheetPageToDoc(doc, list, title) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 28;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(18);
    doc.text(title, margin, 48);

    doc.setFontSize(12);
    const headerY = 92;
    const headerColWidth = (pageWidth - 2 * margin) / 3;
    const headerLeftX = margin;
    const headerCenterX = margin + headerColWidth * 1.5;
    const headerRightX = pageWidth - margin;
    doc.text("Name: _______________", headerLeftX, headerY, { align: "left" });
    doc.text("Date: _______________", headerCenterX, headerY, {
      align: "center",
    });
    doc.text(`Score: ___ / ${list.length}`, headerRightX, headerY, {
      align: "right",
    });

    let y = headerY + 58;
    // Calculate line height based on number of problems to fit on page
    const maxRows = Math.ceil(list.length / 3); // 3 columns
    const availableHeight = 792 - (headerY + 58) - 40; // Page height - header - bottom margin
    const lineHeight = Math.min(108, Math.floor(availableHeight / maxRows));

    doc.setFontSize(18);
    doc.setFont("courier", "normal");

    const cols = 3;
    const problemsLeftMargin = margin + 40;
    const problemsRightMargin = margin + 20;
    const problemsWidth = pageWidth - problemsLeftMargin - problemsRightMargin;
    const colWidth = problemsWidth / cols;
    const colX = new Array(cols)
      .fill(0)
      .map((_, i) => problemsLeftMargin + i * colWidth);

    list.forEach((p, idx) => {
      const col = idx % cols;
      const rowInPage = Math.floor(idx / cols);
      const x = colX[col];
      const baseY = y + rowInPage * lineHeight;

      // Calculate based on original numbers first
      const aOriginal = String(p.a);
      const bOriginal = String(p.b);
      const width = Math.max(aOriginal.length, bOriginal.length);

      // Create spaced numbers with proper alignment
      function addSpacingAligned(numStr, targetWidth) {
        const padded = numStr.padStart(targetWidth, " ");
        return padded.split("").join(" ");
      }

      const aStr = addSpacingAligned(aOriginal, width);
      const bStr = addSpacingAligned(bOriginal, width);
      const opWithB = p.op + " " + bStr;

      // Calculate final width based on spaced numbers
      const finalWidth = Math.max(aStr.length, opWithB.length);
      const top = aStr.padStart(finalWidth, " ");
      const bottom = opWithB.padStart(finalWidth, " ");
      const line = "_".repeat(finalWidth + 2);

      doc.setFontSize(10);
      doc.text(`${idx + 1}.`, x, baseY);

      doc.setFontSize(18);
      const contentX = x + 24;
      doc.text(top, contentX, baseY + 10);
      doc.text(bottom, contentX, baseY + 32);
      doc.text(line, contentX, baseY + 38);
    });
  }

  function toPdfOld_REMOVE_ME(list, title = "Math Worksheet") {
    // OLD jsPDF function - will remove after testing
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 28;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(18);
    doc.text(title, margin, 48);

    doc.setFontSize(12);
    const headerY = 92;
    // Evenly spaced header across three equal columns
    const headerColWidth = (pageWidth - 2 * margin) / 3;
    const headerLeftX = margin;
    const headerCenterX = margin + headerColWidth * 1.5; // center of middle column
    const headerRightX = pageWidth - margin; // right edge of right column
    doc.text("Name: _______________", headerLeftX, headerY, { align: "left" });
    doc.text("Date: _______________", headerCenterX, headerY, {
      align: "center",
    });
    doc.text(`Score: ___ / ${list.length}`, headerRightX, headerY, {
      align: "right",
    });

    let y = headerY + 58;
    const lineHeight = 108; // increase block height for extra space under answer line

    doc.setFontSize(14);
    // Numbers small, problem content larger
    doc.setFont("courier", "normal");

    // Since max problems is 18, always use 3 columns and fit everything on one page
    const cols = 3;
    const problemsLeftMargin = margin + 40; // Left margin for problems section
    const problemsRightMargin = margin + 20; // Smaller right margin
    const problemsWidth = pageWidth - problemsLeftMargin - problemsRightMargin;
    const colWidth = problemsWidth / cols;
    const colX = new Array(cols)
      .fill(0)
      .map((_, i) => problemsLeftMargin + i * colWidth);

    list.forEach((p, idx) => {
      const col = idx % cols;
      const rowInPage = Math.floor(idx / cols);
      const x = colX[col];
      const baseY = y + rowInPage * lineHeight;

      const aStr = String(p.a);
      const bStr = String(p.b);
      const width = Math.max(aStr.length, bStr.length);
      const top = `  ${aStr.padStart(width, " ")}`;
      const bottom = `${p.op} ${bStr.padStart(width, " ")}`;
      const eq = `${"_".repeat(width + 2)}  `;

      doc.setFontSize(10);
      doc.text(`${idx + 1}.`, x, baseY);
      doc.setFontSize(18);
      const contentX = x + 24; // indent inside column
      doc.text(top, contentX, baseY + 10);
      doc.text(bottom, contentX, baseY + 32);
      doc.text(eq, contentX, baseY + 36);
    });

    return doc;
  }

  async function generateMultipleWorksheets(settings) {
    let allWorksheetsHTML = "";

    for (
      let worksheetNum = 1;
      worksheetNum <= settings.worksheetCount;
      worksheetNum++
    ) {
      // Generate new problems for each worksheet
      const list = generateList(settings);
      const worksheetHTML = createWorksheetHTML(
        list,
        `${settings.worksheetTitle} - Sheet ${worksheetNum}`
      );
      allWorksheetsHTML += worksheetHTML;
    }

    // Create temporary container
    const container = document.createElement("div");
    container.innerHTML = allWorksheetsHTML;
    container.classList.add("generating");
    document.body.appendChild(container);

    const options = {
      margin: 0.5,
      filename: `worksheets_${settings.worksheetCount}_sheets.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        letterRendering: true,
        useCORS: true,
      },
      jsPDF: {
        unit: "in",
        format: "letter",
        orientation: "portrait",
      },
    };

    try {
      await html2pdf().set(options).from(container).save();
    } finally {
      // Clean up
      document.body.removeChild(container);
    }
  }

  function addWorksheetToDoc(doc, list, title, worksheetNum, totalWorksheets) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 28;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(18);

    // Use the same title for all worksheets
    doc.text(title, margin, 48);

    doc.setFontSize(12);
    const headerY = 92;
    // Evenly spaced header across three equal columns
    const headerColWidth = (pageWidth - 2 * margin) / 3;
    const headerLeftX = margin;
    const headerCenterX = margin + headerColWidth * 1.5; // center of middle column
    const headerRightX = pageWidth - margin; // right edge of right column
    doc.text("Name: _______________", headerLeftX, headerY, { align: "left" });
    doc.text("Date: _______________", headerCenterX, headerY, {
      align: "center",
    });
    doc.text(`Score: ___ / ${list.length}`, headerRightX, headerY, {
      align: "right",
    });

    let y = headerY + 58;
    const lineHeight = 108; // increase block height for extra space under answer line

    doc.setFontSize(14);
    // Numbers small, problem content larger
    doc.setFont("courier", "normal");

    // Since max problems is 18, always use 3 columns and fit everything on one page
    const cols = 3;
    const problemsLeftMargin = margin + 40; // Left margin for problems section
    const problemsRightMargin = margin + 20; // Smaller right margin
    const problemsWidth = pageWidth - problemsLeftMargin - problemsRightMargin;
    const colWidth = problemsWidth / cols;
    const colX = new Array(cols)
      .fill(0)
      .map((_, i) => problemsLeftMargin + i * colWidth);

    list.forEach((p, idx) => {
      const col = idx % cols;
      const rowInPage = Math.floor(idx / cols);
      const x = colX[col];
      const baseY = y + rowInPage * lineHeight;

      const aStr = String(p.a);
      const bStr = String(p.b);
      const width = Math.max(aStr.length, bStr.length);
      const top = `  ${aStr.padStart(width, " ")}`;
      const bottom = `${p.op} ${bStr.padStart(width, " ")}`;
      const eq = `${"_".repeat(width + 2)}  `;

      doc.setFontSize(10);
      doc.text(`${idx + 1}.`, x, baseY);
      doc.setFontSize(18);
      const contentX = x + 24; // indent inside column
      doc.text(top, contentX, baseY + 10);
      doc.text(bottom, contentX, baseY + 32);
      doc.text(eq, contentX, baseY + 36);
    });
  }

  async function onPdf() {
    console.log("onPdf function called");
    try {
      const settings = readControls();
      console.log("Settings:", settings);

      const pdfBtn = document.getElementById("pdfBtn");
      console.log("PDF button found:", pdfBtn);

      // Show loading state
      if (pdfBtn) {
        pdfBtn.disabled = true;
        pdfBtn.textContent = "Generating PDF...";
        console.log("Button state updated");
      }

      // Back to jsPDF with improved spacing
      if (settings.worksheetCount === 1) {
        // Single worksheet - use existing logic with preview problems
        const list =
          currentProblems.length > 0 ? currentProblems : generateList(settings);
        const doc = toPdfJsPDF(list, settings.worksheetTitle);
        doc.save("worksheet.pdf");
      } else {
        // Multiple worksheets - generate new problems for each
        const doc = generateMultipleWorksheetsJsPDF(settings);
        doc.save(`worksheets_${settings.worksheetCount}_sheets.pdf`);
      }

      // Show donation modal after successful PDF generation
      setTimeout(() => {
        showDonationModal();
      }, 500);

      // Original code (commented out for testing):
      // if (settings.worksheetCount === 1) {
      //   const list = currentProblems.length > 0 ? currentProblems : generateList(settings);
      //   await toPdf(list, settings.worksheetTitle);
      // } else {
      //   await generateMultipleWorksheets(settings);
      // }
    } catch (e) {
      alert(e.message || String(e));
    } finally {
      // Reset button state
      const pdfBtn = document.getElementById("pdfBtn");
      if (pdfBtn) {
        pdfBtn.disabled = false;
        pdfBtn.textContent = "Generate PDF";
      }
    }
  }

  if (previewBtn) previewBtn.addEventListener("click", onPreview);

  // Auto-update preview on control changes (except title which only affects PDF)
  const controlsEl = document.getElementById("controls");
  if (controlsEl) {
    const onControlChange = (e) => {
      // Don't refresh preview when title or worksheet count changes - they only affect PDF
      if (e.target.id === "worksheetTitle" || e.target.id === "worksheetCount")
        return;
      onPreview();
    };
    controlsEl.addEventListener("input", onControlChange);
    controlsEl.addEventListener("change", onControlChange);
  }

  // Keep carry toggle active only if addition is active
  function syncCarryState() {
    const addEl = document.getElementById("opAdd");
    const carryEl = document.getElementById("carryAdd");
    if (!addEl || !carryEl) return;
    const addOn = addEl.checked;
    carryEl.disabled = !addOn;
    if (!addOn) carryEl.checked = false;
  }
  const addEl = document.getElementById("opAdd");
  if (addEl) addEl.addEventListener("change", syncCarryState);
  // Initial sync
  syncCarryState();

  // Modal functionality
  function showDonationModal() {
    const modal = document.getElementById("donationModal");
    if (modal) {
      modal.classList.add("show");
    }
  }

  function hideDonationModal() {
    const modal = document.getElementById("donationModal");
    if (modal) {
      modal.classList.remove("show");
    }
  }

  // Modal event listeners
  const modal = document.getElementById("donationModal");
  const modalClose = document.getElementById("closeModal");
  const modalLater = document.getElementById("laterBtn");

  if (modalClose) {
    modalClose.addEventListener("click", hideDonationModal);
  }

  if (modalLater) {
    modalLater.addEventListener("click", hideDonationModal);
  }

  // Close modal when clicking outside
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        hideDonationModal();
      }
    });
  }

  // Close modal with Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideDonationModal();
    }
  });

  if (pdfBtn) pdfBtn.addEventListener("click", onPdf);

  // Initial preview
  onPreview();
})();
