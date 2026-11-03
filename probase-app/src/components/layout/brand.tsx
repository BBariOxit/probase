import { cn } from '@/lib/utils';

export function Logo({
  className = 'size-6',
  invert = false,
}: {
  className?: string;
  invert?: boolean;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="387 368 502 562"
      className={cn('shrink-0', className)}
      fill="none"
      aria-hidden="true"
    >
      <path
        fill={invert ? '#ffffff' : 'currentColor'}
        className={cn(!invert && 'text-[#171717] dark:text-white')}
        fillRule="evenodd"
        d="M 551,755 L 543,754 L 536,757 L 463,827 L 460,834 L 460,886 L 464,895 L 471,902 L 483,906 L 500,903 L 542,877 L 551,867 L 556,854 L 556,761 Z M 415,403 L 411,412 L 411,424 L 415,434 L 453,483 L 465,491 L 517,493 L 714,493 L 724,496 L 736,503 L 753,522 L 761,541 L 764,565 L 762,580 L 758,593 L 749,609 L 736,622 L 717,631 L 673,632 L 659,637 L 579,716 L 577,720 L 577,727 L 580,731 L 720,732 L 750,726 L 776,715 L 798,701 L 818,683 L 839,656 L 853,628 L 862,597 L 865,573 L 865,552 L 862,528 L 852,495 L 843,476 L 833,460 L 823,447 L 807,431 L 782,413 L 748,398 L 714,392 L 433,392 L 424,395 Z"
      />
      <path
        fill="#2878F5"
        fillRule="evenodd"
        d="M 693,539 L 689,537 L 676,536 L 595,536 L 579,540 L 573,544 L 468,649 L 462,659 L 459,671 L 459,791 L 461,794 L 464,794 L 696,561 L 698,557 L 698,546 Z"
      />
    </svg>
  );
}

export function Brand({
  className,
  logoClassName,
  invert,
  hideText = false,
}: {
  className?: string;
  logoClassName?: string;
  invert?: boolean;
  hideText?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2.5 font-heading select-none text-xl font-bold tracking-tight',
        invert ? 'text-white' : 'text-foreground',
        className,
      )}
    >
      <Logo className={cn('size-6 shrink-0', logoClassName)} invert={invert} />
      {!hideText && (
        <span>
          Pro<span className="text-primary font-bold">Base</span>
        </span>
      )}
    </span>
  );
}
