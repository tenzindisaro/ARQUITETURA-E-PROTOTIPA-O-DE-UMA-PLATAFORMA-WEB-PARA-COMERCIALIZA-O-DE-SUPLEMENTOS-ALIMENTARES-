import { Toaster } from "@/components/ui/sonner";
import { AnnouncementBar } from "@/components/shop/announcement-bar";
import { SiteHeader } from "@/components/shop/site-header";
import { SiteFooter } from "@/components/shop/site-footer";

export default function ShopLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AnnouncementBar />
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
      <Toaster position="top-center" richColors />
    </div>
  );
}
