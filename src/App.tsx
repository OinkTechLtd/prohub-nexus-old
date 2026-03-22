import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Forum from "./pages/Forum";
import Auth from "./pages/Auth";
import CategoryView from "./pages/CategoryView";
import TopicView from "./pages/TopicView";
import CreateTopic from "./pages/CreateTopic";
import Resources from "./pages/Resources";
import CreateResource from "./pages/CreateResource";
import Profile from "./pages/Profile";
import Videos from "./pages/Videos";
import UploadVideo from "./pages/UploadVideo";
import VideoView from "./pages/VideoView";
import VideoSwiper from "./pages/VideoSwiper";
import ModeratorResources from "./pages/ModeratorResources";
import Messages from "./pages/Messages";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Forum />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/category/:slug" element={<CategoryView />} />
          <Route path="/topic/:id" element={<TopicView />} />
          <Route path="/create-topic" element={<CreateTopic />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/create-resource" element={<CreateResource />} />
          <Route path="/videos" element={<Videos />} />
          <Route path="/videos/swipe" element={<VideoSwiper />} />
          <Route path="/upload-video" element={<UploadVideo />} />
          <Route path="/video/:id" element={<VideoView />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:username" element={<Profile />} />
          <Route path="/moderator/resources" element={<ModeratorResources />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/chat/:id" element={<Chat />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
