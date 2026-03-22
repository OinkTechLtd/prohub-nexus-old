import { cn } from "@/lib/utils";

interface BadgeProps {
  icon: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const colorMap: Record<string, string> = {
  gray: "bg-muted text-muted-foreground",
  blue: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
  purple: "bg-purple-500/20 text-purple-600 dark:text-purple-400",
  yellow: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
  orange: "bg-orange-500/20 text-orange-600 dark:text-orange-400",
  red: "bg-red-500/20 text-red-600 dark:text-red-400",
  green: "bg-green-500/20 text-green-600 dark:text-green-400",
  cyan: "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400",
  indigo: "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400",
  pink: "bg-pink-500/20 text-pink-600 dark:text-pink-400",
  rose: "bg-rose-500/20 text-rose-600 dark:text-rose-400",
  gold: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
};

const sizeMap = {
  sm: "w-8 h-8 text-lg",
  md: "w-12 h-12 text-2xl",
  lg: "w-16 h-16 text-4xl",
};

export const Badge = ({ icon, color, size = "md", className }: BadgeProps) => {
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center",
        colorMap[color] || colorMap.gray,
        sizeMap[size],
        className
      )}
    >
      {icon}
    </div>
  );
};
