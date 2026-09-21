"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

interface AlertOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  variant?: "default" | "destructive";
}

interface ModalContextType {
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
  alert: (message: string, options?: AlertOptions) => Promise<void>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
}

export const useConfirm = useModal;
export const useAlert = useModal;

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    resolve: (value: boolean) => void;
    message: string;
    options: ConfirmOptions;
  } | null>(null);

  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    resolve: () => void;
    message: string;
    options: AlertOptions;
  } | null>(null);

  const confirm = useCallback(
    (message: string, options: ConfirmOptions = {}) => {
      return new Promise<boolean>((resolve) => {
        setConfirmState({
          isOpen: true,
          resolve,
          message,
          options,
        });
      });
    },
    [],
  );

  const alert = useCallback((message: string, options: AlertOptions = {}) => {
    return new Promise<void>((resolve) => {
      setAlertState({
        isOpen: true,
        resolve,
        message,
        options,
      });
    });
  }, []);

  const handleConfirmClose = (result: boolean) => {
    if (confirmState) {
      confirmState.resolve(result);
      setConfirmState(null);
    }
  };

  const handleAlertClose = () => {
    if (alertState) {
      alertState.resolve();
      setAlertState(null);
    }
  };

  return (
    <ModalContext.Provider value={{ confirm, alert }}>
      {children}

      {confirmState && (
        <AlertDialog
          open={confirmState.isOpen}
          onOpenChange={(open) => !open && handleConfirmClose(false)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmState.options.title || "Konfirmasi"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmState.message}
                {confirmState.options.description && (
                  <span className="block mt-2">
                    {confirmState.options.description}
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => handleConfirmClose(false)}>
                {confirmState.options.cancelText || "Batal"}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleConfirmClose(true)}
                className={
                  confirmState.options.variant === "destructive"
                    ? "bg-red-600 hover:bg-red-700 focus:ring-red-600"
                    : ""
                }
              >
                {confirmState.options.confirmText || "Ya, Lanjutkan"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {alertState && (
        <AlertDialog
          open={alertState.isOpen}
          onOpenChange={() => handleAlertClose()}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {alertState.options.title || "Pemberitahuan"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {alertState.message}
                {alertState.options.description && (
                  <span className="block mt-2">
                    {alertState.options.description}
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                onClick={() => handleAlertClose()}
                className={
                  alertState.options.variant === "destructive"
                    ? "bg-red-600 hover:bg-red-700 focus:ring-red-600"
                    : ""
                }
              >
                {alertState.options.confirmText || "OK"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </ModalContext.Provider>
  );
};
