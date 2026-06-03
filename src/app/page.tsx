import { redirect } from "next/navigation";

// The app lands on the Dashboard. The Customers list lives at /customers.
export default function Home() {
  redirect("/dashboard");
}
