import React, { forwardRef } from 'react';
import GorhomBottomSheet, {
  type BottomSheetProps as GorhomBottomSheetProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';

export type BottomSheetProps = GorhomBottomSheetProps & {
  children: React.ReactNode;
};

export const BottomSheet = forwardRef<GorhomBottomSheet, BottomSheetProps>(
  ({ children, ...props }, ref) => {
    return (
      <GorhomBottomSheet ref={ref} {...props}>
        <BottomSheetView>{children}</BottomSheetView>
      </GorhomBottomSheet>
    );
  }
);

BottomSheet.displayName = 'BottomSheet';

export { GorhomBottomSheet };
