#include <iostream>
#include <string>
#include <cctype>
using namespace std;
string engtomol(string, string[]);
string moltoeng(string, char[]);

int main()
{
	char alpha[26] = { 'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z' };
	string morse[81] = { ".-", "-...", "-.-.", "-..", ".", "..-.", "--.", "....", "..", ".---", "-.-", ".-..", "--", "-.", "---", ".--.", "--.-", ".-.", "...", "-", "..-", "...-", ".--", "-..-", "-.--", "--.." };
	string text, morsecode;
	char choice;
	char repeat = 'y';

	while (repeat == 'y')
	{
		cout << "Select 1 to decode English text to Morse code.\nSelect 2 to encode Morse code to English text" << endl;
		cin >> choice;

		if (choice == '1')
		{
			cout << "NOTE. DO NOT INPUT A NON ENGLISH CHARACTER. THIS TRANSLATOR EXCLUSIVELY TRANSLATES ENGLISH TEXTS (CAPITALIZED AND NON CAPITALIZED).\n";
			cout << "Enter a text to translate, each word seperated by a space if you want to translate more than one word: ";
			cin.get();
			getline(cin, text);
			cout << "TEXT: " << text << endl;
			cout << "MORSE CODE: " << engtomol(text, morse) << endl;
		}
		else if (choice == '2')
		{
			cout << "Enter a morsecode to translate, each letter code seperated by a space. If you want to translate more than one word, have 3 spaces between each word (for example, ... --- ...   ... --- ...): ";
			cin.get();
			getline(cin, morsecode);
			cout << "MORSECODE: " << morsecode << endl;
			cout << "TEXT: " << moltoeng(morsecode, alpha) << endl;
		}

		cout << "Would you like to continue? Press y to repeat. Press any other key to exit. ";
		cin >> repeat;
	}
	return 0;
}



string engtomol(string text, string morse[])
{
	string morsevalue;
	string spacesbtwletters = " ";
	string spacesbtwwords = "  ";//2 spaces because im going to add it with spacesbtwletters so that it will = 3
	for (int k = 0; text[k]; k++)
	{
		if (text[k] != ' ') //if the word(s) did not encounter a space
		{
			text[k] = toupper(text[k]); //upper case letters and lower case letters are the same hence have the same appropriate morse code.
			morsevalue = spacesbtwletters += morse[text[k] - 'A'] + " ";//A is the first value of the array. by subtracting its finding the appropriate morse code for each letters
		}
		if (text[k] == ' ')
		{
			spacesbtwletters += spacesbtwwords;//adds 3 spaces when there is a space between words
		}
	}
	return morsevalue;
}

string moltoeng(string morsecode, char alpha[])//code to text function
{
	const int count = 0;
	string tran;
	string spacesbtwlettercode = " ";
	string spacesbtwwordcode = " ";
	for (int k = 0; morsecode[k]; k++)
	{
		if (morsecode[k] != ' ')
		{
			tran = spacesbtwlettercode += alpha[k];//A is the first value of the array. by subtracting its finding the appropriate
		}
	}
	return tran;
}