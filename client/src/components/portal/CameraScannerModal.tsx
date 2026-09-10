/**
 * CameraScannerModal
 * Re-exports WaypointScanModal for seamless backward-compatibility
 * throughout the entire CRM and Client Portal.
 */

import React from "react";
import { WaypointScanModal, WaypointScanModalProps } from "./WaypointScanModal";

export type CameraScannerModalProps = WaypointScanModalProps;

export function CameraScannerModal(props: CameraScannerModalProps) {
  return <WaypointScanModal {...props} />;
}

export default CameraScannerModal;
