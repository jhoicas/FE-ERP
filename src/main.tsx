import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import App from "./App.tsx";
import "./index.css";

const googleClientId =
	import.meta.env.VITE_GOOGLE_CLIENT_ID || "REPLACE_WITH_GOOGLE_CLIENT_ID";

const msalClientId =
	import.meta.env.VITE_MSAL_CLIENT_ID || "REPLACE_WITH_MSAL_CLIENT_ID";

const msalTenantId = import.meta.env.VITE_MSAL_TENANT_ID || "common";
const defaultMsalPopupRedirectUri = `${window.location.origin}/msal-popup.html`;
const configuredMsalRedirectUri = import.meta.env.VITE_MSAL_REDIRECT_URI?.trim();
const msalRedirectUri = configuredMsalRedirectUri
	? configuredMsalRedirectUri.endsWith("/msal-popup.html")
		? configuredMsalRedirectUri
		: `${configuredMsalRedirectUri.replace(/\/$/, "")}/msal-popup.html`
	: defaultMsalPopupRedirectUri;

if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
	console.warn(
		"[OAuth] VITE_GOOGLE_CLIENT_ID no está configurado. Usa un valor real en tu .env.*",
	);
}

if (!import.meta.env.VITE_MSAL_CLIENT_ID) {
	console.warn(
		"[OAuth] VITE_MSAL_CLIENT_ID no está configurado. Usa un valor real en tu .env.*",
	);
}

const msalInstance = new PublicClientApplication({
	auth: {
		clientId: msalClientId,
		authority: `https://login.microsoftonline.com/${msalTenantId}`,
		redirectUri: msalRedirectUri,
		navigateToLoginRequestUrl: false,
	},
	cache: {
		cacheLocation: "localStorage",
		storeAuthStateInCookie: false,
	},
});

async function bootstrap() {
	await msalInstance.initialize();
	await msalInstance.handleRedirectPromise().catch((error) => {
		console.error("[MSAL] Error processing redirect hash:", error);
	});

	createRoot(document.getElementById("root")!).render(
		<GoogleOAuthProvider clientId={googleClientId}>
			<MsalProvider instance={msalInstance}>
				<App />
			</MsalProvider>
		</GoogleOAuthProvider>,
	);
}

void bootstrap();
