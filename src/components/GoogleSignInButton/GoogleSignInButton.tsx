"use client";
import { useEffect } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useUserContext } from "@/contexts/UserContext";

import styles from "./GoogleSignInButton.module.css";

import { signInWithGoogle } from "@/app/actions/auth";

interface GoogleSignInProps {
  onError: (error: string) => void;
  onSuccess: () => void;
}

function GoogleSignInButton({ onError, onSuccess }: GoogleSignInProps) {
  const router = useRouter();
  const { setUser } = useUserContext();

  useEffect(() => {
    if (!window.google?.accounts) return;

    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      callback: async (response) => {
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
    });

    window.google.accounts.id.renderButton(document.getElementById("g_id_signin")!, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "pill",
      logo_alignment: "left",
      width: 240,
      locale: "en_US",
    });
  }, [router, setUser, onError, onSuccess]);

  return (
    <>
      <Script src='https://accounts.google.com/gsi/client' async defer />
      <div id='g_id_signin' className={styles.wrapper} />
    </>
  );
}

export default GoogleSignInButton;
