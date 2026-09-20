import { useEffect, useRef, useState } from "react";
import { request } from "./api";
import { useAuth } from "./auth-context";
export function useAudio(text: string) {
  const { audioEnabled } = useAuth();
  const [busy, setBusy] = useState(false),
    [recording, setRecording] = useState(false),
    [playing, setPlaying] = useState(false),
    [message, setMessage] = useState("");
  const recorder = useRef<MediaRecorder | null>(null),
    player = useRef<HTMLAudioElement | null>(null);
  const audioUrl = useRef("");
  const mounted = useRef(true);
  const playback = useRef(0);
  const finishPlayback = useRef<(() => void) | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // This ref is a playback generation counter, not a DOM node. Read its latest value.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      playback.current++;
      finishPlayback.current?.();
      const r = recorder.current;
      if (r?.state === "recording") r.stop();
      r?.stream.getTracks().forEach((t) => t.stop());
      player.current?.pause();
      URL.revokeObjectURL(audioUrl.current);
      window.speechSynthesis?.cancel();
    };
  }, []);
  function stopPlayback() {
    playback.current++;
    player.current?.pause();
    window.speechSynthesis?.cancel();
    finishPlayback.current?.();
    setPlaying(false);
    setBusy(false);
  }
  async function speak() {
    stopPlayback();
    const serial = playback.current;
    setMessage("");
    setPlaying(true);
    const chunks = (text.match(/[^.!?。\n]+[.!?。]?/g) || [text]).flatMap(
      (sentence) => sentence.match(/[\s\S]{1,900}/g) || [],
    );
    try {
      for (const chunk of chunks) {
        if (!mounted.current || serial !== playback.current) break;
        setBusy(true);
        let sound: Blob | undefined;
        if (audioEnabled) {
          try {
            const response = await request("/audio/tts", {
              method: "POST",
              body: JSON.stringify({
                text: chunk,
                lang: /[\u4e00-\u9fff]/.test(chunk) ? "z" : "b",
              }),
            });
            sound = await response.blob();
          } catch {
            /* Original UI falls back to browser speech when TTS is unavailable. */
          }
        }
        if (!mounted.current || serial !== playback.current) break;
        setBusy(false);
        await new Promise<void>((resolve, reject) => {
          finishPlayback.current = resolve;
          if (sound) {
            URL.revokeObjectURL(audioUrl.current);
            audioUrl.current = URL.createObjectURL(sound);
            const audio = new Audio(audioUrl.current);
            player.current = audio;
            audio.onended = () => resolve();
            audio.onerror = () => reject(new Error("语音播放未完成，请重试。"));
            audio.play().catch(reject);
          } else {
            if (!window.speechSynthesis) {
              reject(new Error("当前浏览器不支持语音朗读。"));
              return;
            }
            const utterance = new SpeechSynthesisUtterance(chunk);
            utterance.lang = /[\u4e00-\u9fff]/.test(chunk) ? "zh-CN" : "en-GB";
            utterance.rate = 0.85;
            utterance.onend = () => resolve();
            utterance.onerror = () =>
              serial === playback.current
                ? reject(new Error("语音播放未完成，请重试。"))
                : resolve();
            window.speechSynthesis.speak(utterance);
          }
        });
      }
    } catch (e) {
      if (mounted.current && serial === playback.current)
        setMessage((e as Error).message);
    } finally {
      if (mounted.current && serial === playback.current) {
        setBusy(false);
        setPlaying(false);
        finishPlayback.current = null;
      }
    }
  }
  async function startRecording() {
    setMessage("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw new Error(
          "请使用支持录音的浏览器，通过 localhost 或 HTTPS 打开页面。",
        );
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const r = new MediaRecorder(stream);
      recorder.current = r;
      const chunks: BlobPart[] = [];
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        clearTimeout(timeout);
        if (!mounted.current) return;
        setRecording(false);
        setBusy(true);
        try {
          const form = new FormData();
          form.append(
            "audio",
            new Blob(chunks, { type: r.mimeType }),
            "recording.webm",
          );
          form.append("reference_text", text.slice(0, 500));
          const data = await (
            await request("/audio/assessment", { method: "POST", body: form })
          ).json();
          if (mounted.current)
            setMessage(
              `文本匹配度 ${data.score}/100 · 识别内容：${data.transcript || "未识别到语音"}`,
            );
        } catch (e) {
          if (mounted.current) setMessage((e as Error).message);
        } finally {
          if (mounted.current) setBusy(false);
        }
      };
      r.start();
      setRecording(true);
      const timeout = window.setTimeout(() => {
        if (r.state === "recording") r.stop();
      }, 60000);
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  return {
    audioEnabled,
    busy,
    recording,
    playing,
    stopPlayback,
    message,
    speak,
    startRecording,
    stopRecording: () => recorder.current?.stop(),
  };
}
