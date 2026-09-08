"use client";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";

const PopupComp = ({ isOpen, onClose, PopupData }) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-slate-900 border border-white/10 text-white shadow-2xl rounded-2xl">
        <DialogHeader className="gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-500/20 border border-blue-400/30">
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
            </div>
            <DialogTitle className="text-lg font-bold text-white">
              {PopupData?.header}
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-300 text-sm leading-relaxed">
            {PopupData?.description}
          </DialogDescription>
        </DialogHeader>

        {/* Message list */}
        <ul className="mt-1 space-y-2">
          {PopupData?.message.map((msg, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-slate-300">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
              {msg}
            </li>
          ))}
        </ul>

        {/* Action */}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-all duration-150 shadow shadow-blue-700/30"
          >
            Got it
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PopupComp;

