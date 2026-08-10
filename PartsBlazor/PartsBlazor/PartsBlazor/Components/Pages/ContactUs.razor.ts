export class ContactUs {

}

declare global {
  interface Window {
    ContactUs: typeof ContactUs;
  }
}

window.ContactUs = ContactUs;

const REQUIRED_FIELDS: { id: string; label: string; isValid: (value: string) => boolean }[] = [
  { id: "name", label: "Full Name", isValid: (v) => v.trim().length > 0 },
  { id: "email", label: "Email Address", isValid: isValidEmail },
  { id: "subject", label: "Subject", isValid: (v) => v.trim().length > 0 },
  { id: "message", label: "Message (at least 10 characters)", isValid: (v) => v.trim().length >= 10 },
];

function isValidEmail(value: string): boolean {
  if (!value.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getMissingFields(): string[] {
  const missing: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    const element = document.getElementById(field.id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
    const value = element?.value ?? "";
    if (!field.isValid(value)) {
      missing.push(field.label);
    }
  }

  return missing;
}

function showValidationModal(missingFields: string[]): void {
  const existing = document.getElementById("contact-validation-modal");
  existing?.remove();

  const overlay = document.createElement("div");
  overlay.id = "contact-validation-modal";
  overlay.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;";

  const dialog = document.createElement("div");
  dialog.style.cssText =
    "background:white;border-radius:8px;padding:1.5rem;max-width:420px;width:90%;box-shadow:0 4px 20px rgba(0,0,0,0.3);";

  const heading = document.createElement("h3");
  heading.textContent = "Please complete the required fields";
  heading.style.cssText = "margin:0 0 1rem 0;color:#333;";

  const list = document.createElement("ul");
  list.style.cssText = "margin:0 0 1.5rem 1rem;color:#666;";
  for (const field of missingFields) {
    const item = document.createElement("li");
    item.textContent = field;
    list.appendChild(item);
  }
  window.console.log(missingFields);
  window.console.log("1:25pm");

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "OK";
  closeButton.style.cssText =
    "background-color:#007bff;color:white;border:none;border-radius:4px;padding:0.6rem 1.5rem;font-size:1rem;cursor:pointer;";
  closeButton.addEventListener("click", () => overlay.remove());

  dialog.appendChild(heading);
  dialog.appendChild(list);
  dialog.appendChild(closeButton);
  overlay.appendChild(dialog);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
}

function handleSendClick(event: MouseEvent): void {
  const missingFields = getMissingFields();
  if (missingFields.length > 0) {
    event.preventDefault();
    showValidationModal(missingFields);
  }
}

export function attachSendValidation(): void {
  const sendButton = document.getElementById("send-message-btn");
  if (!sendButton || sendButton.dataset.validationAttached) return;
  sendButton.dataset.validationAttached = "true";
  sendButton.addEventListener("click", handleSendClick);
}
