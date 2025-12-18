// lib/useToast.ts
import { toast } from "sonner";

export type ToastType = "success" | "error" | "warning" | "info";

type ToastOptions = {
  title: string;
  description?: string;
  type?: ToastType;
};

export const showToast = ({
  title,
  description,
  type = "success",
}: ToastOptions) => {
  switch (type) {
    case "success":
      return toast.success(title, { description });
    case "error":
      return toast.error(title, { description });
    case "warning":
      return toast.warning(title, { description });
    case "info":
      return toast.info(title, { description });
    default:
      return toast(title, { description });
  }
};
