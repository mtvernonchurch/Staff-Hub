"use client";

import { useEffect, useState } from "react";
import { removePushSubscriptionAction, savePushSubscriptionAction } from "@/app/(hub)/notifications/actions";

type State = "checking" | "unsupported" | "install" | "denied" | "off" | "on" | "working";

function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = window.atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes;
}

function deviceName(): string {
  const agent = navigator.userAgent;
  if (/iPhone/.test(agent)) return "iPhone";
  if (/iPad/.test(agent)) return "iPad";
  if (/Android/.test(agent)) return "Android";
  if (/Macintosh/.test(agent)) return "Mac";
  if (/Windows/.test(agent)) return "Windows";
  return "Browser";
}

function isAppleMobile(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

function installedToHomeScreen(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Turns phone and browser alerts on or off for the device in your hand. */
export function PushSetup({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<State>("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) {
        if (!cancelled) setState(isAppleMobile() && !installedToHomeScreen() ? "install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setState("denied");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      const existing = await registration.pushManager.getSubscription();
      if (!cancelled) setState(existing ? "on" : "off");
    }
    check().catch(() => {
      if (!cancelled) setState("unsupported");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function turnOn() {
    setState("working");
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
      const result = await savePushSubscriptionAction({ subscription: subscription.toJSON(), device: deviceName() });
      if (!result.ok) {
        await subscription.unsubscribe();
        setMessage(result.message ?? "That didn't work. Try again.");
        setState("off");
        return;
      }
      setState("on");
      setMessage("Alerts are on for this device.");
    } catch {
      setMessage("This device couldn't turn on alerts. Try again, or use email.");
      setState("off");
    }
  }

  async function turnOff() {
    setState("working");
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscriptionAction(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState("off");
      setMessage("Alerts are off for this device.");
    } catch {
      setState("on");
      setMessage("That didn't work. Try again.");
    }
  }

  return (
    <div className="push-setup" aria-live="polite">
      {state === "checking" ? <p className="hint">Checking this device…</p> : null}
      {state === "install" ? (
        <p>
          On an iPhone, alerts only work from the home-screen app. In Safari, tap <strong>Share</strong>, then{" "}
          <strong>Add to Home Screen</strong>. Open the hub from that icon and come back to this page.
        </p>
      ) : null}
      {state === "unsupported" ? <p>This browser can&apos;t show alerts. Use email, or open the hub in Chrome, Edge, Firefox, or Safari.</p> : null}
      {state === "denied" ? (
        <p>Alerts are blocked for this site. Allow notifications for the hub in this device&apos;s settings, then reload this page.</p>
      ) : null}
      {state === "off" ? (
        <>
          <p>Alerts are off on this device.</p>
          <button className="btn btn-primary" type="button" onClick={turnOn}>Turn on alerts on this device</button>
        </>
      ) : null}
      {state === "on" ? (
        <>
          <p><strong>Alerts are on for this device.</strong></p>
          <button className="btn" type="button" onClick={turnOff}>Turn off on this device</button>
        </>
      ) : null}
      {state === "working" ? <p className="hint">One moment…</p> : null}
      {message ? <p className="hint">{message}</p> : null}
    </div>
  );
}
