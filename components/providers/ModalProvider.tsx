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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmOptions {
    title?: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "default" | "destructive";
}

interface PromptOptions {
    title?: string;
    description?: string;
    initialValue?: string;
    placeholder?: string;
    confirmText?: string;
    cancelText?: string;
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
    prompt: (message: string, options?: PromptOptions) => Promise<string | null>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error("useModal must be used within a ModalProvider");
    }
    return context;
};

export const useConfirm = useModal;
export const useAlert = useModal;
export const usePrompt = useModal;

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

    const [promptState, setPromptState] = useState<{
        isOpen: boolean;
        resolve: (value: string | null) => void;
        message: string;
        options: PromptOptions;
        inputValue: string;
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

    const prompt = useCallback((message: string, options: PromptOptions = {}) => {
        return new Promise<string | null>((resolve) => {
            setPromptState({
                isOpen: true,
                resolve,
                message,
                options,
                inputValue: options.initialValue || "",
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

    const handlePromptClose = (result: string | null) => {
        if (promptState) {
            promptState.resolve(result);
            setPromptState(null);
        }
    };

    return (
        <ModalContext.Provider value={{ confirm, alert, prompt }}>
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

            {promptState && (
                <Dialog
                    open={promptState.isOpen}
                    onOpenChange={(open) => !open && handlePromptClose(null)}
                >
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{promptState.options.title || "Input"}</DialogTitle>
                            <DialogDescription>
                                {promptState.message}
                                {promptState.options.description && (
                                    <span className="block mt-2">
                                        {promptState.options.description}
                                    </span>
                                )}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <input
                                autoFocus
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder={promptState.options.placeholder}
                                value={promptState.inputValue}
                                onChange={(e) =>
                                    setPromptState({ ...promptState, inputValue: e.target.value })
                                }
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handlePromptClose(promptState.inputValue);
                                    }
                                }}
                            />
                        </div>
                        <DialogFooter>
                            <button
                                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 mt-2 sm:mt-0"
                                onClick={() => handlePromptClose(null)}
                            >
                                {promptState.options.cancelText || "Batal"}
                            </button>
                            <button
                                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                                onClick={() => handlePromptClose(promptState.inputValue)}
                            >
                                {promptState.options.confirmText || "OK"}
                            </button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </ModalContext.Provider>
    );
};
