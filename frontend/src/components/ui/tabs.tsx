import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = ({ className, ...props }: TabsPrimitive.TabsListProps) => {
  return (
    <TabsPrimitive.List
      className={cn("inline-flex rounded-2xl bg-slate-100 p-1 text-slate-600", className)}
      {...props}
    />
  );
};

const TabsTrigger = ({ className, ...props }: TabsPrimitive.TabsTriggerProps) => {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "rounded-xl px-4 py-2 text-sm font-medium transition data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm",
        className
      )}
      {...props}
    />
  );
};

const TabsContent = ({ className, ...props }: TabsPrimitive.TabsContentProps) => {
  return <TabsPrimitive.Content className={cn("mt-4 outline-none", className)} {...props} />;
};

export { Tabs, TabsContent, TabsList, TabsTrigger };
