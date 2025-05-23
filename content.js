let highlightEnabled = false;
let tooltipElement = null;
let activeLink = null;
let hoverTimeout = null;

// Load initial toggle state from storage
chrome.storage.sync.get(["highlightEnabled"], (data) => {
  highlightEnabled = data.highlightEnabled || false;
  if (highlightEnabled) enableHoverEffect();
});

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "HIGHLIGHT_TOGGLE") {
    highlightEnabled = message.enabled;

    if (highlightEnabled) {
      enableHoverEffect();
    } else {
      disableHoverEffect();
    }
  }
});

function enableHoverEffect() {
  document.querySelectorAll("a[href]").forEach((link) => {
    link.addEventListener("mouseenter", hoverIn);
    link.addEventListener("mouseleave", hoverOut);
  });
}

function disableHoverEffect() {
  document.querySelectorAll("a[href]").forEach((link) => {
    link.removeEventListener("mouseenter", hoverIn);
    link.removeEventListener("mouseleave", hoverOut);
    link.style.outline = "";
    link.removeAttribute("data-color");
    link.removeAttribute("data-locked");
  });
  removeTooltip();
}

function hoverIn(event) {
  const link = event.target.closest("a[href]");
  if (!link) return;

  let color = link.getAttribute("data-color");
  if (!color) {
    color = Math.random() > 0.5 ? "limegreen" : "red";
    link.setAttribute("data-color", color);
  }

  link.style.outline = `2px solid ${color}`;
  link.style.borderRadius = "10px";

  if (color === "red") {
    link.setAttribute("data-locked", "true");
    link.removeEventListener("click", handleClick);
    link.addEventListener("click", handleClick, true);
  }
}

function hoverOut(event) {
  const link = event.target.closest("a[href]");
  if (!link) return;

  // Don't remove highlight if it's the active link
  if (link !== activeLink) {
    link.style.outline = "";
  }

  // Delay removal to allow transition from link to tooltip
  clearTimeout(hoverTimeout);
  hoverTimeout = setTimeout(() => {
    if (!tooltipElement?.matches(':hover') && !link.matches(':hover')) {
      removeTooltip();
    }
  }, 200);
}

function handleClick(e) {
  const link = e.currentTarget;
  const allowed = link.getAttribute("data-allow");
  if (allowed) return;

  e.preventDefault();
  e.stopImmediatePropagation();

  if (tooltipElement && link !== activeLink) {
    removeTooltip();
  }

  activeLink = link;
  showTooltip(link);
}

function showTooltip(link) {
  removeTooltip(); // Only one tooltip at a time

  tooltipElement = document.createElement("div");
  tooltipElement.style.position = "absolute";
  tooltipElement.style.background = "white";
  tooltipElement.style.border = "2px solid red";
  tooltipElement.style.borderRadius = "8px";
  tooltipElement.style.padding = "8px";
  tooltipElement.style.fontSize = "14px";
  tooltipElement.style.boxShadow = "0 4px 10px rgba(0,0,0,0.2)";
  tooltipElement.style.zIndex = "99999";
  tooltipElement.style.width = "220px";

  const rect = link.getBoundingClientRect();
  tooltipElement.style.top = `${rect.bottom + window.scrollY + 5}px`;
  tooltipElement.style.left = `${rect.left + window.scrollX}px`;

  tooltipElement.innerHTML = `
    <div style="color: red; font-weight: bold; margin-bottom: 8px;">⚠ Dangerous Link</div>
    <button id="blockLinkBtn" style="width: 100%; margin-bottom: 5px; padding: 6px; background: #f44336; color: white; border: none; border-radius: 5px;">Block This Link</button>
    <button id="redirectBtn" style="width: 100%; padding: 6px; background: #4CAF50; color: white; border: none; border-radius: 5px;">Redirect Anyway</button>
  `;

  document.body.appendChild(tooltipElement);

  tooltipElement.addEventListener("mouseenter", () => {
    clearTimeout(hoverTimeout);
  });

  tooltipElement.addEventListener("mouseleave", () => {
    hoverTimeout = setTimeout(() => {
      removeTooltip();
    }, 200);
  });

  // Button actions
  tooltipElement.querySelector("#blockLinkBtn").onclick = () => {
    chrome.storage.sync.get(["blockedLinks"], (data) => {
      const list = data.blockedLinks || [];
      list.push({
        link: link.href,
        status: "Blocked",
        reason: "Marked as dangerous by detector",
      });
      chrome.storage.sync.set({ blockedLinks: list });
    });
    removeTooltip();
    alert("Link has been blocked.");
  };

  tooltipElement.querySelector("#redirectBtn").onclick = () => {
    link.setAttribute("data-allow", "true");
    removeTooltip();
    link.click();
  };
}

function removeTooltip() {
  if (tooltipElement) {
    tooltipElement.remove();
    tooltipElement = null;
  }

  if (activeLink) {
    activeLink.style.outline = "";
    activeLink = null;
  }
}
