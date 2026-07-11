import {
  useEffect,
  useRef,
  useState,
} from "react";

type GoogleCredentialResponse = {
  credential?: string;
  select_by?: string;
};

type GoogleIdConfiguration = {
  client_id: string;
  callback: (
    response: GoogleCredentialResponse,
  ) => void;
  ux_mode?: "popup" | "redirect";
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
};

type GoogleButtonConfiguration = {
  type?: "standard" | "icon";
  theme?:
    | "outline"
    | "filled_blue"
    | "filled_black";
  size?: "small" | "medium" | "large";
  text?:
    | "signin_with"
    | "signup_with"
    | "continue_with"
    | "signin";
  shape?:
    | "rectangular"
    | "pill"
    | "circle"
    | "square";
  logo_alignment?: "left" | "center";
  width?: number;
  locale?: string;
};

type GoogleIdentityApi = {
  initialize: (
    configuration: GoogleIdConfiguration,
  ) => void;

  renderButton: (
    parent: HTMLElement,
    configuration: GoogleButtonConfiguration,
  ) => void;

  cancel: () => void;
  disableAutoSelect: () => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleIdentityApi;
      };
    };
  }
}

type GoogleSignInButtonProps = {
  onCredential: (
    idToken: string,
  ) => void | Promise<void>;

  disabled?: boolean;
};

const GOOGLE_SCRIPT_ID =
  "google-identity-services-script";

const GOOGLE_SCRIPT_URL =
  "https://accounts.google.com/gsi/client";

/*
 * Google khuyến nghị initialize một lần.
 * Handler được lưu riêng để vẫn hoạt động khi
 * component render lại.
 */
let googleIdentityInitialized = false;

let currentCredentialHandler:
  | ((
      response: GoogleCredentialResponse,
    ) => void)
  | null = null;

export function GoogleSignInButton({
  onCredential,
  disabled = false,
}: GoogleSignInButtonProps) {
  const buttonContainerRef =
    useRef<HTMLDivElement | null>(null);

  const onCredentialRef =
    useRef(onCredential);

  const disabledRef =
    useRef(disabled);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    onCredentialRef.current =
      onCredential;
  }, [onCredential]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    const clientId = String(
      import.meta.env
        .VITE_GOOGLE_CLIENT_ID || "",
    ).trim();

    if (!clientId) {
      setErrorMessage(
        "Missing VITE_GOOGLE_CLIENT_ID in frontend/.env.local",
      );
      return;
    }

    let disposed = false;

    currentCredentialHandler = (
      response,
    ) => {
      if (
        disposed ||
        disabledRef.current
      ) {
        return;
      }

      const idToken =
        response.credential?.trim();

      if (!idToken) {
        setErrorMessage(
          "Google did not return an ID token.",
        );
        return;
      }

      setErrorMessage("");

      void onCredentialRef.current(
        idToken,
      );
    };

    const renderGoogleButton = () => {
      if (
        disposed ||
        !window.google?.accounts?.id ||
        !buttonContainerRef.current
      ) {
        return;
      }

      if (
        !googleIdentityInitialized
      ) {
        window.google.accounts.id.initialize(
          {
            client_id: clientId,

            callback: (response) => {
              currentCredentialHandler?.(
                response,
              );
            },

            ux_mode: "popup",
            auto_select: false,
            cancel_on_tap_outside: true,
          },
        );

        googleIdentityInitialized = true;
      }

      buttonContainerRef.current.innerHTML =
        "";

      window.google.accounts.id.renderButton(
        buttonContainerRef.current,
        {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          width: 340,
          locale: "en",
        },
      );
    };

    const handleScriptError = () => {
      if (!disposed) {
        setErrorMessage(
          "Could not load Google Identity Services.",
        );
      }
    };

    if (
      window.google?.accounts?.id
    ) {
      renderGoogleButton();
    } else {
      const existingScript =
        document.getElementById(
          GOOGLE_SCRIPT_ID,
        ) as HTMLScriptElement | null;

      if (existingScript) {
        existingScript.addEventListener(
          "load",
          renderGoogleButton,
        );

        existingScript.addEventListener(
          "error",
          handleScriptError,
        );
      } else {
        const script =
          document.createElement(
            "script",
          );

        script.id = GOOGLE_SCRIPT_ID;
        script.src = GOOGLE_SCRIPT_URL;
        script.async = true;
        script.defer = true;

        script.addEventListener(
          "load",
          renderGoogleButton,
        );

        script.addEventListener(
          "error",
          handleScriptError,
        );

        document.head.appendChild(
          script,
        );
      }
    }

    return () => {
      disposed = true;

      const script =
        document.getElementById(
          GOOGLE_SCRIPT_ID,
        ) as HTMLScriptElement | null;

      script?.removeEventListener(
        "load",
        renderGoogleButton,
      );

      script?.removeEventListener(
        "error",
        handleScriptError,
      );

      currentCredentialHandler = null;
    };
  }, []);

  return (
    <div>
      <div
        className={`flex min-h-11 w-full justify-center overflow-hidden rounded-xl transition-opacity ${
          disabled
            ? "pointer-events-none cursor-not-allowed opacity-60"
            : ""
        }`}
        aria-disabled={disabled}
      >
        <div
          ref={buttonContainerRef}
        />
      </div>

      {errorMessage && (
        <p className="mt-2 text-center text-sm text-rose-600 dark:text-rose-400">
          {errorMessage}
        </p>
      )}
    </div>
  );
}