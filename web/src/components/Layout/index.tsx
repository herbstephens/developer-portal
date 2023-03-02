import cn from "classnames";
import { CookieBanner } from "@/components/CookieBanner/CookieBanner";
import { useToggle } from "@/hooks/useToggle";
import { Icon } from "@/components/Icon";
import { Meta } from "@/components/Meta";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { Fragment, ReactNode } from "react";
import { Slide, ToastContainer } from "react-toastify";
import { AppSelector } from "./AppSelector";
import { LoggedUserDisplay } from "./LoggedUserDisplay";
import { NavItem } from "./NavItem";
import { NavItemGroup } from "./NavItemsGroup";
import { NewAppDialog } from "./NewAppDialog";
import { SystemStatus } from "./SystemStatus";
import { urls } from "@/lib/urls";

export const Layout = (props: {
  title?: string;
  mainClassName?: string;
  children: ReactNode;
}) => {
  const router = useRouter();
  const newAppDialog = useToggle();

  return (
    <Fragment>
      <ToastContainer autoClose={5000} transition={Slide} />
      <CookieBanner />
      <Meta title={props.title} url={router.asPath} />

      <div className="grid h-screen grid-cols-auto/1fr font-rubik">
        <NewAppDialog
          open={newAppDialog.isOn}
          onClose={newAppDialog.toggleOff}
        />

        <aside className="min-w-[304px] overflow-y-auto px-6 gap-y-4 pt-8 pb-6 grid grid-rows-auto/1fr/auto">
          <header className="cursor-pointer">
            <Link href="/">
              <div className="grid justify-start gap-y-0.5">
                <Icon
                  name="logo"
                  className="w-32 h-6 text-neutral-dark ml-4.5"
                />
                <div className="px-1 rounded-md bg-primary/20 justify-self-end">
                  <p className="font-sora text-[12px] text-primary">
                    {"<"}
                    <span className="font-bold">Dev</span>
                    {"/Portal>"}
                  </p>
                </div>
              </div>
            </Link>
          </header>

          <div className="grid gap-y-8 content-start">
            <AppSelector onNewAppClick={newAppDialog.toggleOn} />

            <nav className="min-h-0 overflow-y-auto">
              <NavItemGroup heading="set up">
                <NavItem icon="apps" name="App Profile" href={urls.app()} />

                <NavItem
                  icon="world-id-sign-in"
                  name="Sign in"
                  // FIXME: Proper app id
                  href={urls.appSignIn("app_123")}
                />

                <NavItem
                  icon="notepad"
                  name="Custom Actions"
                  // FIXME: Proper app id
                  href={urls.appActions("app_123")}
                />
              </NavItemGroup>

              <NavItemGroup heading="build" className="mt-6">
                <NavItem
                  name="Docs"
                  icon="document"
                  href="https://id.worldcoin.org/docs"
                />

                <NavItem
                  name="Debugger"
                  icon="speed-test"
                  href={urls.debugger()}
                />

                <NavItem
                  name="Support"
                  icon="help"
                  href="https://discord.gg/worldcoin"
                />
              </NavItemGroup>

              <hr className="text-f3f4f5 my-4 mr-10" />

              <NavItemGroup withoutHeading>
                <NavItem name="My Team" icon="team" href={urls.team()} />

                <NavItem
                  name="Log Out"
                  icon="logout"
                  href="/logout"
                  customColor="text-danger"
                />
              </NavItemGroup>
            </nav>
          </div>

          <footer className="grid items-center justify-between gap-y-4">
            <LoggedUserDisplay />
            <SystemStatus />
          </footer>
        </aside>

        <main
          className={cn(
            "max-h-screen p-4 overflow-y-scroll py-8 px-6",
            props.mainClassName
          )}
        >
          {props.children}
        </main>
      </div>
    </Fragment>
  );
};