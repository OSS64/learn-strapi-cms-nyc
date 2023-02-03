import AuthLogo from "./extensions/logo.png";
import favicon from "./extensions/favicon.ico";
export default {
  config: {
    locales: [
      // 'ar',
      // 'fr',
      // 'cs',
      // 'de',
      // 'dk',
      // 'es',
      // 'he',
      // 'id',
      // 'it',
      // 'ja',
      // 'ko',
      // 'ms',
      // 'nl',
      // 'no',
      // 'pl',
      // 'pt-BR',
      // 'pt',
      // 'ru',
      // 'sk',
      // 'sv',
      // 'th',
      // 'tr',
      // 'uk',
      // 'vi',
      // 'zh-Hans',
      // 'zh',
    ],
    translations: {
      en: {
        "Auth.form.welcome.title": "Welcome to NYC CoffEE",
        "Auth.form.welcome.subtitle": "Log in to your App",
        "app.components.LeftMenu.navbrand.title": "NYC Coffee",
        "app.components.HomePage.welcomeBlock.content.again":
          "Welcome to NYC Coffee",
      },
    },
    auth: {
      logo: AuthLogo,
    },
    head: {
      favicon: favicon,
    },
    theme: {
      // overwrite light theme properties
      light: {
        colors: {
          primary100: "#F6E9D4",
          primary200: "#EDD1AC",
          primary500: "#54301A",
          primary600: "#482313",
          primary700: "#3C190D",
          danger700: "#961031",
        },
      },
    },
    tutorials: false,
    notifications: {
      releases: false,
    },
  },
  bootstrap(app) {
    console.log(app);
  },
};
