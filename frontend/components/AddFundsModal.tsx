"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Copy } from "lucide-react";
import { useState } from "react";

interface AddFundsModalProps {
  address: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AddFundsModal({
  address,
  isOpen,
  onClose,
}: AddFundsModalProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Funds</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center gap-4 p-4">
          <p className="text-sm text-muted-foreground">
            Scan this QR code or copy the address below to send funds to your wallet.
          </p>
          <div className="p-4 bg-white rounded-lg">
            <QRCodeSVG value={address} size={200} />
          </div>
          <div className="flex items-center gap-2 w-full p-2 bg-muted rounded-lg">
            <p className="text-sm font-mono break-all flex-grow">{address}</p>
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          {isCopied && <p className="text-sm text-green-500">Copied to clipboard!</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
