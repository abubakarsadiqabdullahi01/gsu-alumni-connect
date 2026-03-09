import * as React from "react";
import { cn } from "@/lib/utils";

type PopoverContextValue = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

function usePopoverContext() {
  const ctx = React.useContext(PopoverContext);
  if (!ctx) {
    throw new Error("Popover components must be used within <Popover>.");
  }
  return ctx;
}

function Popover({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const value = React.useMemo(() => ({ open, setOpen }), [open]);

  return <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>;
}

type PopoverTriggerProps = {
  asChild?: boolean;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

function PopoverTrigger({ asChild, children, ...props }: PopoverTriggerProps) {
  const { open, setOpen } = usePopoverContext();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    props.onClick?.(event);
    if (!event.defaultPrevented) {
      setOpen(!open);
    }
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: handleClick,
    } as React.HTMLAttributes<HTMLElement>);
  }

  return (
    <button type="button" {...props} onClick={handleClick}>
      {children}
    </button>
  );
}

type PopoverContentProps = React.HTMLAttributes<HTMLDivElement> & {
  align?: "start" | "center" | "end";
  sideOffset?: number;
};

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ className, align = "center", sideOffset = 4, style, ...props }, ref) => {
    const { open } = usePopoverContext();

    if (!open) return null;

    const alignmentStyle =
      align === "start"
        ? { left: 0 }
        : align === "end"
          ? { right: 0 }
          : { left: "50%", transform: "translateX(-50%)" };

    return (
      <div className="relative">
        <div
          ref={ref}
          className={cn(
            "absolute z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
            className
          )}
          style={{
            marginTop: sideOffset,
            ...alignmentStyle,
            ...style,
          }}
          {...props}
        />
      </div>
    );
  }
);
PopoverContent.displayName = "PopoverContent";

export { Popover, PopoverTrigger, PopoverContent };
