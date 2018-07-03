/*Conway's Game of Life:
· Each cell with one or no neighbors dies from loneliness
· Each cell with four or more neighbors dies from overpopulation
· Each cell with two or three neighbors survives.*/


#include <iostream>
#include <iomanip>
#include <cstdlib>
#include <array>
#include  <thread>
#include  <chrono>
using namespace std;

const int n = 10;
int checkx(const char life_array[][n + 2], int row, int col);
//function to determine how many neighbors 

int main()
{
	int row;
	int col;
	int x;
	cout << "Please enter how many times you wish to play the game of life!" << endl;
	cin >> x;

	char life_array[n + 2][n + 2]; //original array
	char new_array[n + 2][n + 2]; //array for next generation
	int num_neighbors = 0; //Neighbors of each square in generation

	
		
		for (row = 1; row < n + 2; row++)
			for (col = 1; col < n + 2; col++)
			{
				int random_integer = (rand() % 2);
				if ((random_integer) == 0)
					life_array[row][col] = ' ';
				else
					life_array[row][col] = '0';
			}

		for (int num_gen = 0; num_gen < x; num_gen++) //generation loop
		{
			this_thread::sleep_for(std::chrono::milliseconds(900));
			cout << setw(10) << "Generation:" << num_gen + 1 << endl << endl; //Header
			
			for (row = 1; row < n + 1; row++) //Print Generation
			{
				cout << endl;
				for (col = 1; col < n + 1; col++)
				{
					cout << life_array[row][col] << " ";
				}
			}
			for (row = 1; row < n + 2; row++) //Loop to determine neighbors
			{
				cout << endl;
				for (col = 1; col < n + 2; col++)
				{
					if ((life_array[row][col]) == '0') //If box has an 0
					{
						num_neighbors = checkx(life_array, row, col);
						if (num_neighbors == 2 || num_neighbors == 3) //Conditions to determine if 0 lives or dies
							new_array[row][col] = '0';
						else
							new_array[row][col] = ' ';
					}
					else //If no '0' in box
					{
						num_neighbors = checkx(life_array, row, col);
						if (num_neighbors == 2 || num_neighbors == 3) //Condition to determine if 0 is born
							new_array[row][col] = '0';
						else
							new_array[row][col] = ' ';
					}
				}
			}
			for (row = 1; row < n + 2; row++) //Copies new array to original array. 
				for (col = 1; col < n + 2; col++)
					life_array[row][col] = new_array[row][col];
		}
		system("PAUSE");
		return 0;
}


int checkx(const char life_array[][n + 2], int row, int col)
//function to determine number of neighbors
{
	int num_neighbors;
	num_neighbors = 0;
	if ((life_array[row - 1][col - 1]) == '0')
		num_neighbors++;
	if ((life_array[row][col - 1]) == '0')
		num_neighbors++;
	if ((life_array[row][col + 1]) == '0')
		num_neighbors++;
	if ((life_array[row - 1][col]) == '0')
		num_neighbors++;
	if ((life_array[row + 1][col - 1]) == '0')
		num_neighbors++;
	if ((life_array[row - 1][col + 1]) == '0') 
		num_neighbors++; 
	if ((life_array[row + 1][col]) == '0')
		num_neighbors++;
	if ((life_array[row + 1][col + 1]) == '0')
		num_neighbors++;
	return num_neighbors;
}


	

/*
// Chapter7.13.cpp
//

#include <iostream>
//#include "stdafx.h"
using namespace std;

const int WIDTH = 20, HEIGHT = 20;

void copy_board(int board1[HEIGHT + 2][WIDTH + 2], int board2[HEIGHT + 2][WIDTH + 2]); //function to copy board1 onto board2
void new_generation(int board[HEIGHT + 2][WIDTH + 2]); //calculates what the next generation should look like
void display_board(int board[HEIGHT + 2][WIDTH + 2]); //output board to the screen

int main()
{

	char repeat;
	//using a board with a border for ease of calculation, but only displaying the inner shell
	//live and dead cells stored as 1s and 0s

	cout << "This is Conway's Game of Life. Keep pressing Enter to see the next generation: ";

	int board[HEIGHT + 2][WIDTH + 2] = {
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 },
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 },
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 },
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 },
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 },
	{ 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0 },
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 },
	{ 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0 },
	{ 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0 },
	{ 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0 },
	{ 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0 },
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 },
	{ 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0 },
	{ 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0 },
	{ 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0 },
	{ 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0 },
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 },
	{ 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0 },
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 },
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 },
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 },
	{ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 }
	};

	do
	{
		display_board(board);
		cin.get(repeat);
		new_generation(board);

	} while (repeat == '\n');

	return 0;
}

void copy_board(int board1[HEIGHT + 2][WIDTH + 2], int board2[HEIGHT + 2][WIDTH + 2])
{
	for (int i = 0; i < HEIGHT + 2; i++)
	{
		for (int j = 0; j < WIDTH + 2; j++)
		{
			board2[i][j] = board1[i][j];
		}
	}
}

void new_generation(int board[HEIGHT + 2][WIDTH + 2])
{
	int temp_board[HEIGHT + 2][WIDTH + 2];
	int neighbours;

	for (int i = 0; i < HEIGHT + 2; i++)
	{
		for (int j = 0; j < WIDTH + 2; j++)
		{
			if (i == 0 || j == 0 || i == HEIGHT + 2 || j == WIDTH + 2)
				temp_board[i][j] = 0;
			else
			{
				//counting alive neighbouring cells
				neighbours = board[i - 1][j - 1] + board[i - 1][j] + board[i - 1][j + 1] + board[i][j - 1] + board[i][j + 1] + board[i + 1][j - 1] + board[i + 1][j] + board[i + 1][j + 1];
				if (board[i][j] == 1)
				{
					if (neighbours < 2 || neighbours > 3)
						temp_board[i][j] = 0; //cell dies due to loneliness or overcrowding
					else
						temp_board[i][j] = 1;
				}

				else
				{
					if (neighbours == 3)
						temp_board[i][j] = 1; //birth of a new cell
					else
						temp_board[i][j] = 0;
				}
			}
		}
	}

	copy_board(temp_board, board);


}

void display_board(int board[HEIGHT + 2][WIDTH + 2])
{
	for (int i = 1; i < HEIGHT + 1; i++) //only displaying inner shell
	{
		for (int j = 1; j < WIDTH + 1; j++)
		{
			if (board[i][j] == 1)
				cout << "*";
			else
				cout << " ";
		}
		cout << endl;
	}
}
*/