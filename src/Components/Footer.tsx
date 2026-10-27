import { dataSource } from '../data';

const link = 'font-semibold text-pw-teal-dark hover:underline';

export default function Footer() {
  return (
    <footer className="mx-auto mt-6 max-w-6xl border-t px-4 py-6 text-sm text-pw-muted sm:px-6 lg:px-8">
      <p>
        Data and images from the{' '}
        <a
          href={dataSource.source}
          className={link}
          target="_blank"
          rel="noreferrer"
        >
          Palworld Wiki
        </a>{' '}
        on wiki.gg (retrieved {dataSource.scrapedAt}), used under{' '}
        <a
          href="https://creativecommons.org/licenses/by-sa/4.0"
          className={link}
          target="_blank"
          rel="noreferrer"
        >
          CC BY-SA 4.0
        </a>
        . Changes were made: it was reformatted and combined into this app.
      </p>
      <p className="mt-2">
        Palworld and its artwork belong to Pocketpair, Inc. This is an
        unofficial fan project and is not affiliated with or endorsed by
        Pocketpair or wiki.gg.{' '}
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
