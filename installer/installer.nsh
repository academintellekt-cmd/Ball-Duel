; On uninstall (not on update) remove the autostart shortcut made by installer/autostart.ps1.
!macro customUnInstall
  ${ifNot} ${isUpdated}
    SetShellVarContext all
    Delete "$SMSTARTUP\${PRODUCT_FILENAME}.lnk"
  ${endIf}
!macroend
