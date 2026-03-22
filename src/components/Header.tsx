import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LogOut, User, Shield, MessageCircle } from "lucide-react";
import RSSFeed from "./RSSFeed";
import { useUserRole } from "@/hooks/useUserRole";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface HeaderProps {
  user: any;
}

const Header = ({ user }: HeaderProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canModerateResources, canModerateTopics } = useUserRole();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Выход выполнен",
      description: "До скорой встречи!",
    });
    navigate("/auth");
  };

  const showModeratorLink = canModerateResources || canModerateTopics;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center space-x-2">
          <span className="text-2xl font-bold text-primary">ProHub</span>
        </Link>

        <nav className="hidden md:flex items-center space-x-6">
          <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">
            Форум
          </Link>
          <Link to="/resources" className="text-sm font-medium hover:text-primary transition-colors">
            Ресурсы
          </Link>
          <Link to="/videos" className="text-sm font-medium hover:text-primary transition-colors">
            Видео
          </Link>
          {showModeratorLink && (
            <Link to="/moderator/resources" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1">
              <Shield className="h-4 w-4" />
              Модерация
            </Link>
          )}
          <RSSFeed />
        </nav>

        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/messages")}
                className="hidden md:flex"
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar>
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user.email?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    Профиль
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/messages")} className="md:hidden">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Сообщения
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Выйти
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button onClick={() => navigate("/auth")}>
              Войти
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;