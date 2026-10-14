"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { RotateCcw, Check, X, PenTool } from "lucide-react";

interface SignaturePadProps {
  title?: string;
  subtitle?: string;
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}

export function SignaturePad({
  title = "ลงลายมือชื่อดิจิทัล",
  subtitle = "กรุณาใช้นิ้วมือหรือปากกาเซ็นชื่อในกรอบด้านล่าง",
  onSave,
  onClose,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Resize canvas to match display size with DPI scaling
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#0f172a"; // Deep navy / slate ink
    }
  }, []);

  useEffect(() => {
    setupCanvas();
    window.addEventListener("resize", setupCanvas);
    return () => window.removeEventListener("resize", setupCanvas);
  }, [setupCanvas]);

  const getPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else if ("clientX" in e) {
      return {
        x: (e as MouseEvent).clientX - rect.left,
        y: (e as MouseEvent).clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pos = getPos(e.nativeEvent);
    lastPointRef.current = pos;
    setIsDrawing(true);
    setHasDrawn(true);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 1.25, 0, Math.PI * 2);
      ctx.fillStyle = "#0f172a";
      ctx.fill();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPointRef.current) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const currentPos = getPos(e.nativeEvent);

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke();

    lastPointRef.current = currentPos;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPointRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;

    // Export as transparent PNG
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-zinc-200 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-150 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-xs">
              <PenTool className="size-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 leading-tight">
                {title}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="p-4 bg-zinc-50">
          <div className="relative rounded-xl border-2 border-dashed border-zinc-300 bg-white shadow-inner overflow-hidden">
            {/* Guide line */}
            <div className="pointer-events-none absolute inset-x-8 bottom-12 border-b border-zinc-200/80 flex items-center justify-between">
              <span className="text-[11px] text-zinc-300 font-medium pb-1 select-none">
                ลายเซ็น / ลายมือชื่อ
              </span>
              <span className="text-[11px] text-zinc-300 font-medium pb-1 select-none">
                (Sign here)
              </span>
            </div>

            <canvas
              ref={canvasRef}
              className="h-56 w-full cursor-crosshair touch-none select-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />

            {!hasDrawn && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-zinc-400">
                <PenTool className="size-8 stroke-[1.2] mb-1.5 opacity-50" />
                <span className="text-xs">แตะแล้วลากนิ้วเพื่อเซ็นชื่อ</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-zinc-150 px-5 py-3.5 bg-white">
          <button
            type="button"
            onClick={clearCanvas}
            disabled={!hasDrawn}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 transition-all active:scale-95"
          >
            <RotateCcw className="size-3.5" />
            <span>ล้างลายเซ็น</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasDrawn}
              className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-zinc-800 disabled:opacity-40 transition-all active:scale-95"
            >
              <Check className="size-4" />
              <span>บันทึกชื่อ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
