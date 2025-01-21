"use client";
import { memo, useEffect, useCallback, useRef } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";

import styles from "./GoogleSignInButton.module.css";

import { useUserContext } from "@/contexts/UserContext";
import { signInWithGoogle } from "@/app/actions/auth";

interface GoogleSignInProps {
  onError: (error: string) => void;
  onSuccess: () => void;
}

function GoogleSignInButton({ onError, onSuccess }: GoogleSignInProps) {
  const router = useRouter();
  const { setUser } = useUserContext();
  const isInitialized = useRef(false);

  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      try {
        const result = await signInWithGoogle(response.credential);

        if (result.error) {
          throw new Error(result.error);
        }

        setUser(result.user);
        onSuccess();
        router.push("/learn");
      } catch (error) {
        onError((error as Error).message);
      }
    },
    [router, setUser, onError, onSuccess]
  );

  const initializeButton = useCallback(() => {
    const buttonElement = document.getElementById("g_id_signin");
    if (!buttonElement || !window.google?.accounts || isInitialized.current) return;

    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      callback: handleCredentialResponse,
    });

    window.google.accounts.id.renderButton(buttonElement, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "pill",
      logo_alignment: "left",
      width: 240,
      locale: "en_US",
    });

    isInitialized.current = true;
  }, [handleCredentialResponse]);

  useEffect(() => {
    if (window.google?.accounts) {
      initializeButton();
    }
  }, [initializeButton]);

  return (
    <>
      <Script src='https://accounts.google.com/gsi/client' strategy='afterInteractive' onLoad={initializeButton} />
      <div id='g_id_signin' className={styles.wrapper} />
    </>
  );
}

export default memo(GoogleSignInButton);
