import { dataSource } from '../data';

const link = 'font-semibold text-pw-link hover:underline';

export default function Footer() {
  return (
    <footer className="mx-auto mt-6 max-w-7xl border-t px-4 py-6 text-sm text-pw-muted sm:px-6 lg:px-8">
      <p>
        Game data from{' '}
        <a
          href={dataSource.source}
          className={link}
          target="_blank"
          rel="noreferrer"
        >
          paldb.cc
        </a>
        {dataSource.gameVersion &&
          `, covering Palworld ${dataSource.gameVersion}`}{' '}
        (retrieved {dataSource.scrapedAt}). Images and habitat notes from the
        Palworld wikis on{' '}
        <a
          href="https://palworld.wiki.gg"
          className={link}
          target="_blank"
          rel="noreferrer"
        >
          wiki.gg
        </a>{' '}
        and{' '}
        <a
          href="https://palworld.fandom.com"
          className={link}
          target="_blank"
          rel="noreferrer"
        >
          Fandom
        </a>
        , used under{' '}
        <a
          href="https://creativecommons.org/licenses/by-sa/4.0"
          className={link}
          target="_blank"
          rel="noreferrer"
        >
          CC BY-SA
        </a>
        . Changes were made: it was reformatted and combined into this app.
      </p>
      <p className="mt-2">
        Palworld and its artwork belong to Pocketpair, Inc. This is an
        unofficial fan project and is not affiliated with or endorsed by
        Pocketpair, paldb.cc, wiki.gg or Fandom.{' '}
        <a
          href="https://github.com/JaedenW/paldex-react"
          className={link}
          target="_blank"
          rel="noreferrer"
        >
          Source on GitHub
        </a>
        .
      </p>
    </footer>
  );
}
