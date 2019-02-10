#include <iostream>
#include <string>
#include <cstdlib>
using namespace std;


int main()
{
	//declare variables to store user input
	string *getMessage, *temp;

	int selection, k;
	int words = -1;
	long long int shift;

	bool cont = true;

	//implement a loop so that it will continue asking until the user provides a positive integer
	// the following provides ONLY part of the loop body, which you should complete
	while (words <= 0)
	{
		cout << "How many words are in your message? \n";
		cout << "Enter value: ";

		// get user input integer here
		cin >> words;
		if (words <= 0)
		{
			cout << "\nInvalid value. Please Re-enter a number of positive value\n";
		}

	}

	//declare a dynamic array of string type with the specified number of elements
	getMessage = new string[words];

	while (cont)
	{
		cout << "\nSelect one of these options: (1) Get Message (2) Encrypt (3) Print (4) Quit";
		cout << "\nSelection: ";

		// obtain user input option (an integer)
		cin >> selection;

		// based on the input the program will perform one of the following operations using switch statement
		switch (selection)
		{
		case 1://Get Message
			cout << "\nEnter Message to Encrypt: ";

			// Get the specified number of words from the user
			for (int i = 0; i < words; ++i)
			{
				cin >> getMessage[i];
			}

			cout << "\nEnter number of letters to shift: ";
			cin >> shift;
			shift = shift % 26;

			break;

		case 2: //Encrypt
			// Based on the shifting encryption strategy described above, encrypt the individual words
			// and store the encrypted message in the ORIGINAL array.
			// Be careful about the difference between the lower case letters and upper case letters
			for (int i = 0; i < words; ++i)
			{
				for (size_t j = 0; j < getMessage[i].length(); ++j) //replaced int with size_t to get rid of sign-compare
				{
					if ((getMessage[i][j] >= 97) && (getMessage[i][j] <= 122)) //97 is ascii value of 'a,' up to z
					{
						getMessage[i][j] = (((getMessage[i][j] - 'a') + shift) % 26 + 'a'); //letter = ( ( (letter - 'a') + shift ) % 26 + 'a' ) )
					}
					else if ((getMessage[i][j] >= 65) && (getMessage[i][j] <= 90))
					{
						getMessage[i][j] = (((getMessage[i][j] - 'A') + shift) % 26 + 'A');
					}
				}
			}
			//cout << "\nEnter Message to Encrypt: "; *Asked to be done in case 1
			//cout << "\nEnter number of letters to shift: "; *Asked to be done in case 1
			break;

		case 3: //Print
			cout << "\nThe message is: ";

			// Print out the words stored in the dynamic array of string that you created above
			temp = getMessage;
			k = 0;
			while (k < words)
			{
				cout << *temp;
				cout << " ";
				temp++;
				k++;
			}
			cout << endl;
			break;

		case 4:
			cont = false;
			break;

		default:
			break;
		}
	}

	// Remember to release the memory you allocate above!!
	delete[]getMessage;
	return 0;

}