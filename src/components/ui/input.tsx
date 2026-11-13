import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, value, onChange, onFocus, onBlur, ...props }, ref) => {
    const isNumberType = type === "number" && value !== undefined
    const [isFocused, setIsFocused] = React.useState(false)
    const [draftValue, setDraftValue] = React.useState<string>(() =>
      value !== undefined && value !== null ? String(value) : ""
    )

    React.useEffect(() => {
      if (!isNumberType) return
      if (!isFocused) {
        setDraftValue(value !== undefined && value !== null ? String(value) : "")
      }
    }, [value, isFocused, isNumberType])

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (isNumberType) {
        setIsFocused(true)
        setDraftValue(value !== undefined && value !== null ? String(value) : "")
      }
      onFocus?.(e)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isNumberType) {
        onChange?.(e)
        return
      }

      let raw = e.target.value

      // If user completely clears the field with Backspace/Delete, keep it empty so no stuck 0 or 1 remains
      if (raw === "") {
        setDraftValue("")
        return
      }

      // If field had "0" and user types a digit like "4" (producing "04" or "40" when cursor is at start),
      // strip leading zeros before integer digits so "4" is the first digit
      if (/^-?0+\d/.test(raw) && !raw.startsWith("0.") && !raw.startsWith("-0.")) {
        raw = raw.replace(/^(-?)0+(?=\d)/, "$1")
        e.target.value = raw
      }

      setDraftValue(raw)

      const parsed = Number(raw)
      if (!Number.isNaN(parsed)) {
        onChange?.(e)
      }
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (isNumberType) {
        setIsFocused(false)
        if (draftValue.trim() === "" || Number.isNaN(Number(draftValue))) {
          setDraftValue(value !== undefined && value !== null ? String(value) : "")
        } else {
          setDraftValue(String(Number(draftValue)))
        }
      }
      onBlur?.(e)
    }

    return (
      <input
        type={type}
        value={isNumberType ? (isFocused ? draftValue : (value ?? "")) : value}
        onFocus={handleFocus}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
