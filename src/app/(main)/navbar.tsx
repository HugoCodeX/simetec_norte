import { ModeToggle } from "@/components/mode-toggle";
import { UserDropdown } from "@/components/user-dropdown";
import { getServerSession } from "@/lib/get-session";

export async function Navbar() {
  const session = await getServerSession();
  const user = session?.user;


  if (!user) return null;
  

  return (
    <header className="bg-background border-b sticky top-0 z-30">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 pl-16 md:pl-4">
        <div className="font-semibold text-lg">
          
        </div>
        <div className="flex items-center gap-2">
          <UserDropdown user={user}/>
        </div>
      </div>
    </header>
  );
}
