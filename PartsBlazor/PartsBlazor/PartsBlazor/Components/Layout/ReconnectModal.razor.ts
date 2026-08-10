declare const Blazor: {
    reconnect(): Promise<boolean>;
    resumeCircuit(): Promise<boolean>;
};

interface ReconnectStateChangedEventDetail {
    state: "show" | "hide" | "failed" | "rejected";
}

type ReconnectStateChangedEvent = CustomEvent<ReconnectStateChangedEventDetail>;

// Set up event handlers
const reconnectModal = document.getElementById("components-reconnect-modal") as HTMLDialogElement;
reconnectModal.addEventListener("components-reconnect-state-changed", handleReconnectStateChanged as EventListener);

const retryButton = document.getElementById("components-reconnect-button") as HTMLButtonElement;
retryButton.addEventListener("click", retry);

const resumeButton = document.getElementById("components-resume-button") as HTMLButtonElement;
resumeButton.addEventListener("click", resume);

function handleReconnectStateChanged(event: ReconnectStateChangedEvent): void {
    if (event.detail.state === "show") {
        reconnectModal.showModal();
    } else if (event.detail.state === "hide") {
        reconnectModal.close();
    } else if (event.detail.state === "failed") {
        document.addEventListener("visibilitychange", retryWhenDocumentBecomesVisible);
    } else if (event.detail.state === "rejected") {
        location.reload();
    }
}

async function retry(): Promise<void> {
    document.removeEventListener("visibilitychange", retryWhenDocumentBecomesVisible);

    try {
        // Reconnect will asynchronously return:
        // - true to mean success
        // - false to mean we reached the server, but it rejected the connection (e.g., unknown circuit ID)
        // - exception to mean we didn't reach the server (this can be sync or async)
        const successful = await Blazor.reconnect();
        if (!successful) {
            // We have been able to reach the server, but the circuit is no longer available.
            // We'll reload the page so the user can continue using the app as quickly as possible.
            const resumeSuccessful = await Blazor.resumeCircuit();
            if (!resumeSuccessful) {
                location.reload();
            } else {
                reconnectModal.close();
            }
        }
    } catch {
        // We got an exception, server is currently unavailable
        document.addEventListener("visibilitychange", retryWhenDocumentBecomesVisible);
    }
}

async function resume(): Promise<void> {
    try {
        const successful = await Blazor.resumeCircuit();
        if (!successful) {
            location.reload();
        }
    } catch {
        reconnectModal.classList.replace("components-reconnect-paused", "components-reconnect-resume-failed");
    }
}

async function retryWhenDocumentBecomesVisible(): Promise<void> {
    if (document.visibilityState === "visible") {
        await retry();
    }
}
