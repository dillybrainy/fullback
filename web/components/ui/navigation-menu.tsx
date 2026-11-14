// Adapted from shadcn base-nova. The link-only navbar needs no popup viewport.
import { NavigationMenu as NavigationMenuPrimitive } from "@base-ui/react/navigation-menu";
import { cn } from "@/lib/utils";

function NavigationMenu({ className, ...props }: NavigationMenuPrimitive.Root.Props) {
  return <NavigationMenuPrimitive.Root data-slot="navigation-menu" className={cn("navigation-menu", className)} {...props} />;
}
function NavigationMenuList({ className, ...props }: NavigationMenuPrimitive.List.Props) {
  return <NavigationMenuPrimitive.List data-slot="navigation-menu-list" className={cn("navigation-menu-list", className)} {...props} />;
}
function NavigationMenuItem(props: NavigationMenuPrimitive.Item.Props) {
  return <NavigationMenuPrimitive.Item data-slot="navigation-menu-item" {...props} />;
}
function NavigationMenuLink({ className, ...props }: NavigationMenuPrimitive.Link.Props) {
  return <NavigationMenuPrimitive.Link data-slot="navigation-menu-link" className={cn("navigation-menu-link", className)} {...props} />;
}
export { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink };
