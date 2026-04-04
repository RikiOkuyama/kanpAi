"use client";

import { useRef, useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase-client";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";

interface PageProps {
  params: Promise<{ partyId: string }>;
}

function getUserId(): string {
  if (typeof window === "undefined") return "";
  let uid = localStorage.getItem("kanpai_uid");
  if (!uid) {
    uid = uuidv4();
    localStorage.setItem("kanpai_uid", uid);
  }
  return uid;
}

export default function CameraPage({ params }: PageProps) {
  const { partyId } = use(params);
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [captured, setCaptured] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const startCamera = async (mode: "user" | "environment") => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setError("カメラへのアクセスが拒否されました。ブラウザの設定を確認してください。");
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleFlip = () => {
    const newMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newMode);
    startCamera(newMode);
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // フロントカメラは左右反転を戻す
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    setCaptured(canvas.toDataURL("image/jpeg", 0.85));
  };

  const handleRetake = () => {
    setCaptured(null);
  };

  const handleUpload = async () => {
    if (!captured || !canvasRef.current) return;
    setUploading(true);

    try {
      // base64 → Blob
      const res = await fetch(captured);
      const blob = await res.blob();

      const photoId = uuidv4();
      const storageRef = ref(storage, `parties/${partyId}/${photoId}.jpg`);
      await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
      const downloadUrl = await getDownloadURL(storageRef);

      // メタデータをFirestoreに保存
      await fetch(`/api/party/${partyId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storageUrl: downloadUrl,
          uploadedBy: getUserId(),
        }),
      });

      router.push(`/party/${partyId}/album`);
    } catch (err) {
      console.error(err);
      setError("アップロードに失敗しました。もう一度試してください。");
      setUploading(false);
    }
  };

  return (
    <div className="h-dvh bg-black flex flex-col">
      {/* ヘッダー */}
      <header className="flex items-center justify-between px-4 pb-3 z-10" style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}>
        <Link href={`/party/${partyId}`} className="text-white text-2xl">←</Link>
        <span className="text-white font-bold">📸 はい、チーズ！</span>
        {!captured && (
          <button onClick={handleFlip} className="text-white text-2xl">🔄</button>
        )}
        {captured && <div className="w-8" />}
      </header>

      {/* カメラ / プレビュー */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {!captured ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{
              transform: facingMode === "user" ? "scaleX(-1)" : "none",
            }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={captured}
            alt="撮影プレビュー"
            className="w-full h-full object-contain"
          />
        )}

        <canvas ref={canvasRef} className="hidden" />

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <p className="text-white text-center px-6">{error}</p>
          </div>
        )}
      </div>

      {/* コントロール */}
      <div className="px-6 pt-8 flex flex-col items-center gap-4" style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}>
        {!captured ? (
          <button
            onClick={handleCapture}
            className="w-20 h-20 rounded-full border-4 border-white bg-white/20 hover:bg-white/30 active:scale-95 transition-all flex items-center justify-center"
          >
            <div className="w-14 h-14 rounded-full bg-white" />
          </button>
        ) : (
          <div className="flex gap-4 w-full">
            <button
              onClick={handleRetake}
              disabled={uploading}
              className="flex-1 py-4 rounded-2xl border border-white/50 text-white font-bold text-base disabled:opacity-50"
            >
              撮り直す
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 py-4 rounded-2xl text-black font-bold text-base disabled:opacity-50"
              style={{ background: uploading ? "#aaa" : "white" }}
            >
              {uploading ? "アップロード中..." : "✅ 投稿する"}
            </button>
          </div>
        )}
        <p className="text-white/50 text-xs">
          みんなに見られます。楽しい1枚を！
        </p>
      </div>
    </div>
  );
}
