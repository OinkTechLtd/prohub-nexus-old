import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserLinkProps {
  username: string;
  avatarUrl?: string | null;
  showAvatar?: boolean;
  className?: string;
}

const UserLink = ({ username, avatarUrl, showAvatar = true, className = "" }: UserLinkProps) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/profile/${username}`);
  };

  return (
    <div 
      className={`inline-flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity ${className}`}
      onClick={handleClick}
    >
      {showAvatar && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback>{username[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
      )}
      <span className="font-medium text-foreground hover:underline">
        {username}
      </span>
    </div>
  );
};

export default UserLink;
