document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("toggleHighlight");
  const tableBody = document.querySelector("#linksTable tbody");
  const detailDisplay = document.getElementById("detailInfoDisplay");
  const tableView = document.getElementById("blockedTable");
  const backBtn = document.getElementById("backToTable");
  const linkDetail = document.getElementById("linkDetail");

  // Load toggle state
  chrome.storage.sync.get(["highlightEnabled"], (data) => {
    toggle.checked = data.highlightEnabled || false;
  });

  // Toggle change handler
toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  chrome.storage.sync.set({ highlightEnabled: enabled });

  // Send message to active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: "HIGHLIGHT_TOGGLE",
        enabled,
      });
    }
  });
});


  // Load blocked links
  chrome.storage.sync.get(["blockedLinks"], (data) => {
    const links = data.blockedLinks || [];
    links.forEach((item, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${item.link}</td><td>${item.status}</td>`;
      row.addEventListener("click", () => {
        tableView.style.display = "none";
        detailDisplay.style.display = "block";
        linkDetail.innerHTML = `
          <strong>Link:</strong><br>${item.link}<br><br>
          <strong>Status:</strong> ${item.status}<br><br>
          <strong>Reason:</strong><br>${item.reason}
        `;
      });
      tableBody.appendChild(row);
    });
  });

  // Back button handler
  backBtn.addEventListener("click", () => {
    detailDisplay.style.display = "none";
    tableView.style.display = "block";
  });
});
