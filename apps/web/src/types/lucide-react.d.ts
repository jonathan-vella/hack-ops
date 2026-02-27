declare module "lucide-react" {
  import type { ComponentType, SVGProps } from "react";
  type IconProps = SVGProps<SVGSVGElement> & { size?: number | string };
  type Icon = ComponentType<IconProps>;

  export const XIcon: Icon;
  export const ChevronDownIcon: Icon;
  export const ChevronUpIcon: Icon;
  export const CheckIcon: Icon;
  export const ChevronRightIcon: Icon;
  export const CircleIcon: Icon;
  export const DotIcon: Icon;
}
