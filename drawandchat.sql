-- phpMyAdmin SQL Dump
-- version 4.9.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Czas generowania: 24 Wrz 2022, 22:36
-- Wersja serwera: 8.0.18
-- Wersja PHP: 7.3.11

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Baza danych: `drawandchat`
--

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `blockedusers`
--

CREATE TABLE `blockedusers` (
  `ID` int(11) NOT NULL,
  `roomOwnerName` varchar(255) CHARACTER SET utf8 COLLATE utf8_polish_ci NOT NULL,
  `username` varchar(255) CHARACTER SET utf8 COLLATE utf8_polish_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_polish_ci;

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `messages`
--

CREATE TABLE `messages` (
  `ID` int(11) NOT NULL,
  `roomID` int(11) NOT NULL,
  `author` varchar(255) CHARACTER SET utf8 COLLATE utf8_polish_ci NOT NULL,
  `contents` longtext CHARACTER SET utf8 COLLATE utf8_polish_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_polish_ci;

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `refreshtokens`
--

CREATE TABLE `refreshtokens` (
  `ID` int(11) NOT NULL,
  `token` varchar(255) CHARACTER SET utf8 COLLATE utf8_polish_ci NOT NULL,
  `created(miliseconds)` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_polish_ci;

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `users`
--

CREATE TABLE `users` (
  `ID` int(11) NOT NULL,
  `username` text CHARACTER SET utf8 COLLATE utf8_polish_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8 COLLATE utf8_polish_ci NOT NULL,
  `drawing` longtext CHARACTER SET utf8 COLLATE utf8_polish_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_polish_ci;

--
-- Indeksy dla zrzutów tabel
--

--
-- Indeksy dla tabeli `blockedusers`
--
ALTER TABLE `blockedusers`
  ADD PRIMARY KEY (`ID`);

--
-- Indeksy dla tabeli `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`ID`);

--
-- Indeksy dla tabeli `refreshtokens`
--
ALTER TABLE `refreshtokens`
  ADD PRIMARY KEY (`ID`),
  ADD UNIQUE KEY `token` (`token`);

--
-- Indeksy dla tabeli `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`ID`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT dla tabeli `blockedusers`
--
ALTER TABLE `blockedusers`
  MODIFY `ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT dla tabeli `messages`
--
ALTER TABLE `messages`
  MODIFY `ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=205;

--
-- AUTO_INCREMENT dla tabeli `refreshtokens`
--
ALTER TABLE `refreshtokens`
  MODIFY `ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1996;

--
-- AUTO_INCREMENT dla tabeli `users`
--
ALTER TABLE `users`
  MODIFY `ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
