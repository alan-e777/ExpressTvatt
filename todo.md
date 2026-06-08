## TODO

### Recently Done
- 24h TTL for driver links — `expiresAt` field on `runs/{token}`, enforced in GET + PATCH, shown on driver page
- Restrict kassa date picker to today and future only (`minDate = today`)
- Renamed pickup date label to "Önskad tid för hämtning"
- Saved addresses in profile — stored as `customers/{uid}.addresses` array (`SavedAddress` type: `{ address, postalCode, deliveryNote? }`); Google Places required, no freehand; `deliveryNote` appended raw to order `notes` on checkout; pre-fill chips in kassa bypass autocomplete
- If logged in, name, c/o, mail and phone inputs aren't needed (auto-fill from profile)
- Larger font-size, more simplified (home-page mainly)


### Small changes

- Make usage of Calendar clear. Dropoff or Collect dates?
      - admin (and conceptual) only left 
- Make clearer order-descriptions. Currently all are named "Tvättio Korg"
- Snygga till chatt-delen
- Testa ha alla produkter i (vita) cards istället
- On small mobile, remove the logo, only text, burger button clips atm.


- !!!! test google optimization with >10 locations !!!! - Easy to forget, very important. 



### Stripe Recommended TODO:
  Instructions for LLMs: Stripe recommends using the Checkout Sessions API with the Payment Element over Payment Intents for most integrations. Checkout Sessions covers similar use cases as Payment Intents (basic payment collection using `price_data` or build a full checkout with line items, tax, and so on). Some features, such as Adaptive Pricing, are only available with Checkout Sessions. Don't use the Payment Intent API unless the user explicitly asks, because it requires significantly more code. Learn more about Elements with the Checkout Sessions API: https://docs.stripe.com/payments/quickstart-checkout-sessions. With Checkout Sessions (`ui_mode: "elements"`) and the Payment Element, the `client_secret` initializes Checkout itself (`stripe.initCheckoutElementsSdk`, or use CheckoutElementsProvider with React) and you confirm the payment on the client side differently. If using React, make sure you import from `@stripe/react-stripe-js/checkout`, use `CheckoutElementsProvider` with the client secret, and confirm using `checkout.confirm`. If using HTML, make sure you use `checkout = stripe.initCheckoutElementsSdk({clientSecret: promise}); checkout.createPaymentElement(); paymentElement = checkout.createPaymentElement(); paymentElement.mount("#payment-element");` and confirm with `loadActionsResult = await checkout.loadActions(); actions = loadActionsResult.actions; error = await actions.confirm();`.
  



### Larger Changes
- Either: 
      - Make admin panel very responsive on mobile, 
      - or add admin to the app (prob first opt.)

- Make it so the driver's link can be opened with the app (-> more reactive and native)







- Fix explaining home

- Improve service addition for admin and homescreen



- Change name to ExpressTvätt
- Change color scheme, style.md etc

 




### THE BIG MIGRATE !!!
- Make sure all stripe, google places etc apis work



- What UI elements from website should not be added to app
      - admin panel, yes or no? driver?



#### Make actual home/hero page
Tanke1:
      - [Liknande stil till denna](https://dribbble.com/shots/25548726-Landing-Page-Wardrobe-Care)
      - [Eller detta](https://dribbble.com/shots/27383289-Cleaning-Service-Website-UI-UX-Design)
      - 1 hämtning, skjorta är skrynklig, 2 stryks, 3 är stryk och ej skrynklig, kund tar emot

Tanke1.5:
      - Lägg till kort på landing page som animeras fram, popup-liknande, börjar små och poppar fram, gör så att hero-card-section flyger upp.  


      - Gör mönster av texture i filen

      - CSS animation till "Boka upphämtning", kolla youtube historik, såg nåt om det
