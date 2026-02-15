"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type VoiceInputState = "idle" | "listening" | "processing";

interface UseVoiceInputOptions {
  lang?: string;
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  continuous?: boolean;
}

interface UseVoiceInputReturn {
  state: VoiceInputState;
  transcript: string;
  interimTranscript: string;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const { lang = "ja-JP", onResult, onError, continuous = false } = options;

  const [state, setState] = useState<VoiceInputState>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  onResultRef.current = onResult;
  onErrorRef.current = onError;

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const start = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onErrorRef.current?.("このブラウザは音声入力に対応していません");
      return;
    }

    // 既存のインスタンスがあればクリーンアップ
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = continuous;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setState("listening");
      setTranscript("");
      setInterimTranscript("");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = "";
      let interimText = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      if (finalText) {
        setTranscript(finalText);
        setInterimTranscript("");
      } else {
        setInterimTranscript(interimText);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // no-speech は自然に起こるのでエラー扱いしない
      if (event.error === "no-speech") {
        setState("idle");
        return;
      }
      const messages: Record<string, string> = {
        "not-allowed": "マイクの使用が許可されていません。ブラウザの設定を確認してね。",
        "audio-capture": "マイクが見つかりません。接続を確認してね。",
        network: "ネットワークエラーが発生しました。",
        aborted: "",
      };
      const msg = messages[event.error] || `音声認識エラー: ${event.error}`;
      if (msg) onErrorRef.current?.(msg);
      setState("idle");
    };

    recognition.onend = () => {
      setState((prev) => (prev === "listening" ? "idle" : prev));
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      onErrorRef.current?.("音声認識を開始できませんでした");
      setState("idle");
    }
  }, [lang, continuous]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setState("idle");
    }
  }, []);

  const reset = useCallback(() => {
    stop();
    setTranscript("");
    setInterimTranscript("");
    setState("idle");
  }, [stop]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return { state, transcript, interimTranscript, isSupported, start, stop, reset };
}
