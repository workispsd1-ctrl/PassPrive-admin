// lib/toast.ts
import { toast } from "sonner"

type ToastOptions = {
  title: string
  description?: string
  type?: "success" | "error" | "warning" | "info"
}

export const showToast = (options: ToastOptions) => {
  const { type = "success", title, description } = options

  switch (type) {
    case "success":
      return toast.success(title, { description })
    case "error":
      return toast.error(title, { description })
    case "warning":
      return toast.warning(title, { description })
    case "info":
      return toast.info(title, { description })
    default:
      return toast(title, { description })
  }
}