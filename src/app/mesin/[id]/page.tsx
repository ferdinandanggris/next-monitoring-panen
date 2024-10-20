// import MapComponent from '@/components/MapComponent'
'use client';
import dinamic from "next/dynamic";
import Grid from "@mui/material/Grid2";
import { styled } from '@mui/material/styles';
import Paper from '@mui/material/Paper';
import React, {useState} from "react";
import MesinPage from "@/app/mesin/page";
import { Avatar, List, ListItem, ListItemAvatar, ListItemText, Typography } from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
const MapComponent = dinamic(() => import("@/components/MapComponent"), { ssr: false });

function createData(
  name: string,
  calories: number,
  fat: number,
  carbs: number,
  protein: number,
) {
  return { name, calories, fat, carbs, protein };
}

const rows = [
  createData('Frozen yoghurt', 159, 6.0, 24, 4.0),
  createData('Ice cream sandwich', 237, 9.0, 37, 4.3),
  createData('Eclair', 262, 16.0, 24, 6.0),
  createData('Cupcake', 305, 3.7, 67, 4.3),
  createData('Gingerbread', 356, 16.0, 49, 3.9),
];

function generate(element: React.ReactElement<unknown>) {
  return [0, 1, 2].map((value) =>
    React.cloneElement(element, {
      key: value,
    }),
  );
}

const Demo = styled('div')(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
}));

export default function page() {
  const [dense, setDense] = useState(false);
  const [secondary, setSecondary] = useState(true);
  return (
    <div>
      <Grid container spacing={2}>
        <Grid size={8}>
            <MapComponent width="100%" height="500px" />
        </Grid>
        <Grid size={4}>
          <Demo>
            <List dense={dense}>
              {generate(
                <ListItem>
                  <ListItemAvatar>
                    <Avatar>
                      <FolderIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Single-line item"
                    secondary={secondary ? 'Secondary text' : null}
                  />
                </ListItem>,
              )}
            </List>
          </Demo>
        </Grid>
        <Grid size={12}>
            <MesinPage  />
        </Grid>
      </Grid>
    </div>
  );
}
