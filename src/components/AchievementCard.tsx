import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/Badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface AchievementCardProps {
  name: string;
  description: string;
  icon: string;
  color: string;
  points: number;
  earned?: boolean;
  earnedAt?: string | null;
  className?: string;
}

export const AchievementCard = ({
  name,
  description,
  icon,
  color,
  points,
  earned = false,
  earnedAt,
  className,
}: AchievementCardProps) => {
  return (
    <Card className={cn("relative overflow-hidden", !earned && "opacity-50", className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Badge icon={icon} color={earned ? color : "gray"} size="md" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">{name}</h3>
            <p className="text-xs text-muted-foreground mb-2">{description}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-primary">+{points} очков</span>
              {earned && earnedAt && (
                <span className="text-xs text-muted-foreground">
                  {format(new Date(earnedAt), "d MMM yyyy", { locale: ru })}
                </span>
              )}
            </div>
          </div>
        </div>
        {earned && (
          <div className="absolute top-2 right-2">
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
