"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { KidsMascot } from "@/components/kids/KidsMascot";
import { RejectionFeedback } from "@/components/tasks/RejectionFeedback";
import { photoKey, STORAGE_BUCKET, STORAGE_PROVIDER } from "@/lib/photo-key";
import { CLIENT_DEV_BYPASS_AUTH } from "@/lib/config";
import { requestBrowserPosition, type GeoResult } from "@/lib/geo";

type Task = {
  id: string;
  title: string;
  require_photo: boolean;
  kind: "points" | "reminder";
  family_id: string;
  assigned_child_id: string;
};

export function CompleteTask({
  task,
  rejectionNote = null,
}: {
  task: Task;
  rejectionNote?: string | null;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [photoGeo, setPhotoGeo] = useState<GeoResult | null>(null);
  const [photoGeoPending, setPhotoGeoPending] = useState(true);
  const mustPhoto = task.require_photo || task.kind === "points";
  const childNote = note.trim() || null;

  useEffect(() => {
    let cancelled = false;
    setPhotoGeoPending(true);
    void requestBrowserPosition().then((result) => {
      if (cancelled) return;
      setPhotoGeo(result);
      setPhotoGeoPending(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (photo) return;
    let stream: MediaStream | undefined;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((media) => {
        stream = media;
        if (videoRef.current) videoRef.current.srcObject = media;
      })
      .catch(() => setError("Não deu para abrir a câmera. Permita o acesso."));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [photo]);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPhoto(canvas.toDataURL("image/jpeg", 0.72));
    if (!photoGeo?.ok) {
      setPhotoGeoPending(true);
      void requestBrowserPosition().then((result) => {
        setPhotoGeo(result);
        setPhotoGeoPending(false);
      });
    }
  }

  async function refreshPhotoGeo() {
    setPhotoGeoPending(true);
    const result = await requestBrowserPosition();
    setPhotoGeo(result);
    setPhotoGeoPending(false);
    return result;
  }

  async function send() {
    if (mustPhoto && !photo) {
      setError("Tire a foto para concluir.");
      return;
    }
    setPending(true);
    setError(null);
    const completionId = crypto.randomUUID();
    let key: string | null = null;
    let geo = photoGeo;
    if (!geo?.ok) {
      geo = await refreshPhotoGeo();
    }
    const lat = geo.ok ? geo.fix.lat : null;
    const lng = geo.ok ? geo.fix.lng : null;
    const locationAvailable = geo.ok;

    if (CLIENT_DEV_BYPASS_AUTH) {
      const formData = new FormData();
      formData.set("task_id", task.id);
      formData.set("completion_id", completionId);
      formData.set("family_id", task.family_id);
      formData.set("child_id", task.assigned_child_id);
      formData.set("kind", task.kind);
      formData.set("location_available", String(locationAvailable));
      if (lat != null) formData.set("lat", String(lat));
      if (lng != null) formData.set("lng", String(lng));
      if (childNote) formData.set("child_note", childNote);

      if (photo) {
        key = photoKey(task.family_id, task.assigned_child_id, completionId);
        formData.set("photo_key", key);
        const blob = await (await fetch(photo)).blob();
        formData.set("photo", blob, "task.jpg");
      }

      const response = await fetch("/api/dev/complete-task", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Não foi possível enviar.");
        setPending(false);
        return;
      }

      router.push("/app/kids");
      router.refresh();
      return;
    }

    const supabase = createClient();

    if (photo) {
      key = photoKey(task.family_id, task.assigned_child_id, completionId);
      const blob = await (await fetch(photo)).blob();
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(key, blob, { contentType: "image/jpeg", upsert: false });
      if (uploadError) {
        setError("Não foi possível enviar a foto.");
        setPending(false);
        return;
      }
    }

    const { error: insertError } = await supabase.from("task_completions").insert({
      id: completionId,
      family_id: task.family_id,
      task_id: task.id,
      child_id: task.assigned_child_id,
      photo_key: key,
      storage_provider: STORAGE_PROVIDER,
      lat,
      lng,
      location_available: locationAvailable,
      child_note: childNote,
    });

    if (insertError) {
      setError(insertError.message);
      setPending(false);
      return;
    }

    await supabase
      .from("tasks")
      .update({ status: task.kind === "points" ? "awaiting_approval" : "completed" })
      .eq("id", task.id);

    router.push("/app/kids");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <KidsMascot size="header" />
      <h1 className="text-3xl font-extrabold">Missão: {task.title}</h1>
      {rejectionNote !== undefined ? <RejectionFeedback note={rejectionNote} /> : null}
      {mustPhoto ? (
        <p className="font-extrabold text-navy/70">Manda uma foto para os pais verem. Essa não dá para pular.</p>
      ) : (
        <p className="font-extrabold text-navy/70">Foto opcional neste lembrete.</p>
      )}
      <p
        className={`rounded-2xl px-4 py-3 text-sm font-bold ${
          photoGeo?.ok ? "bg-success/15 text-navy" : "bg-white text-navy/70 ring-1 ring-navy/10"
        }`}
      >
        {photoGeoPending
          ? "Buscando o local da foto…"
          : photoGeo?.ok
            ? "Local da foto pronto — vai junto com o envio."
            : photoGeo?.message ?? "Sem local da foto. Dá para enviar mesmo assim."}
      </p>
      {!photoGeoPending && photoGeo && !photoGeo.ok ? (
        <button
          type="button"
          onClick={() => void refreshPhotoGeo()}
          className="text-sm font-extrabold text-royal"
        >
          Tentar local de novo
        </button>
      ) : null}

      {!photo ? (
        <video ref={videoRef} autoPlay playsInline className="w-full rounded-3xl bg-navy" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="Prévia" className="w-full rounded-3xl" />
      )}

      <label className="block font-bold text-navy">
        Quer contar o que aconteceu? (opcional)
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={280}
          rows={3}
          placeholder="Ex.: já varri o quintal, só faltou a folha do canto"
          className="mt-2 w-full resize-y rounded-2xl border border-navy/10 bg-white px-4 py-3 text-base font-semibold outline-none ring-royal focus:ring-2"
        />
        <span className="mt-1 block text-sm font-semibold text-navy/50">{note.length}/280</span>
      </label>

      <div className="flex flex-col gap-3">
        {!photo ? (
          <button onClick={capture} className="kids-pop min-h-14 rounded-2xl bg-royal py-4 font-extrabold text-white">
            Tirar foto
          </button>
        ) : (
          <>
            <button onClick={() => setPhoto(null)} className="min-h-14 rounded-2xl bg-white py-4 font-extrabold ring-2 ring-navy/10">
              Tirar outra
            </button>
            <button
              disabled={pending}
              onClick={send}
              className="kids-pop min-h-14 rounded-2xl bg-success py-4 font-extrabold text-navy shadow-[0_4px_0_#3a9a1f]"
            >
              {pending ? "Enviando..." : "Enviar para os pais"}
            </button>
          </>
        )}
        {!mustPhoto && !photo ? (
          <button
            disabled={pending}
            onClick={send}
            className="kids-pop min-h-14 rounded-2xl bg-pending py-4 font-extrabold text-navy"
          >
            Já fiz, sem foto
          </button>
        ) : null}
      </div>
      {error ? <p className="font-bold text-alert">{error}</p> : null}
    </div>
  );
}
